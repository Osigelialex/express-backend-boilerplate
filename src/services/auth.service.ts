import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import prisma from "@/config/database";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";
import {
  BCRYPT_ROUNDS,
  DUMMY_HASH,
  OTP_PURPOSE,
} from "@/config/constants/auth";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import {
  AuthResponseDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SignupDto,
  TokenPairDto,
  UserResponseDto,
  VerifyEmailDto,
} from "@/dtos/auth.dto";
import {
  enqueuePasswordResetEmail,
  enqueueVerificationEmail,
} from "@/queues/email.queue";
import { OtpService } from "@/services/otp.service";
import { TokenDenylist } from "@/services/tokenDenylist.service";
import { UnauthorizedError, ForbiddenError } from "@/utils/appError";
import {
  emailTakenError,
  invalidRefreshTokenError,
  invalidTokenError,
  serviceUnavailableError,
} from "@/utils/authErrors";
import { normalizeEmail } from "@/utils/email";
import { ErrorCode } from "@/utils/errorCodes";
import { isUniqueViolation } from "@/utils/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/utils/tokens";
import { toPublicUserDto } from "@/utils/userMapper";

/**
 * Account lifecycle: signup, login, token refresh/rotation, logout, email
 * verification and password reset.
 *
 * Auth model:
 *  - access token:  short-lived stateless JWT (Authorization: Bearer).
 *  - refresh token: long-lived JWT, rotated on every use. Used and logged-out
 *    tokens are denylisted in Redis, and a password reset revokes all of a
 *    user's sessions. Redis being down fails CLOSED (503).
 *  - email verification / password reset use 6-digit OTPs (OtpService).
 *
 * Responses for verify/resend/forgot are deliberately identical for known and
 * unknown emails so the API can't be used to discover registered accounts.
 */
export class AuthService {
  constructor(
    private readonly denylist: TokenDenylist = new TokenDenylist(),
    private readonly otps: OtpService = new OtpService(),
  ) {}

  private issueTokens(user: User): TokenPairDto {
    return {
      accessToken: signAccessToken({ userId: user.id, role: user.role }),
      refreshToken: signRefreshToken(user.id),
    };
  }

  /** Issues an OTP and queues the email. Never throws: the account exists. */
  private async queueVerificationEmail(user: User): Promise<void> {
    try {
      const otp = await this.otps.issue(OTP_PURPOSE.emailVerify, user.id);
      await enqueueVerificationEmail({ to: user.email, name: user.name, otp });
    } catch (error) {
      // The user can ask for another email via /auth/send-email-verification.
      logger.error("Failed to enqueue verification email", {
        context: "AuthService.queueVerificationEmail",
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /** Runs a Redis-backed operation, failing closed with 503 if Redis is down. */
  private async withRedis<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      logger.error("Redis unavailable", {
        context: "AuthService.withRedis",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw serviceUnavailableError();
    }
  }

  async signup(dto: SignupDto): Promise<UserResponseDto> {
    const email = normalizeEmail(dto.email);

    if (await prisma.user.findUnique({ where: { email } })) {
      throw emailTakenError();
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let user: User;
    try {
      user = await prisma.user.create({
        data: {
          name: dto.name,
          email,
          password,
          // Without verification there is nothing to wait for.
          emailVerified: ENV.REQUIRE_EMAIL_VERIFICATION ? null : new Date(),
        },
      });
    } catch (error) {
      // Two concurrent signups can both pass the findUnique above.
      if (isUniqueViolation(error)) throw emailTakenError();
      throw error;
    }

    if (ENV.REQUIRE_EMAIL_VERIFICATION) {
      await this.queueVerificationEmail(user);
    }

    return { user: toPublicUserDto(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });

    // Always run bcrypt, even for unknown emails, so timing doesn't leak
    // whether the account exists.
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.password ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    if (ENV.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
      throw new ForbiddenError(
        ERROR_MESSAGES.EMAIL_NOT_VERIFIED,
        ErrorCode.EMAIL_NOT_VERIFIED,
      );
    }

    return { user: toPublicUserDto(user), ...this.issueTokens(user) };
  }

  /** Exchanges a refresh token for a new pair (rotation: the old one dies). */
  async refresh(dto: RefreshTokenDto): Promise<TokenPairDto> {
    let payload;
    try {
      payload = verifyRefreshToken(dto.refreshToken);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError(
          ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED,
          ErrorCode.TOKEN_EXPIRED,
        );
      }
      throw invalidRefreshTokenError();
    }

    // Revoked wholesale (password reset)?
    if (
      await this.withRedis(() =>
        this.denylist.isUserRevokedSince(payload.userId, payload.iat),
      )
    ) {
      throw invalidRefreshTokenError();
    }

    // Atomic: only one concurrent caller can rotate a given token.
    const rotated = await this.withRedis(() =>
      this.denylist.denyRefresh(payload.jti, payload.exp),
    );
    if (!rotated) throw invalidRefreshTokenError();

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw invalidRefreshTokenError();

    return this.issueTokens(user);
  }

  async logout(dto: LogoutDto): Promise<void> {
    let payload;
    try {
      payload = verifyRefreshToken(dto.refreshToken);
    } catch {
      // Expired, malformed or foreign tokens are unusable already.
      return;
    }

    await this.withRedis(() =>
      this.denylist.denyRefresh(payload.jti, payload.exp),
    );
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<UserResponseDto> {
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });

    // Unknown and already-verified accounts get the same answer as a wrong
    // code, so this endpoint can't be used to probe which emails exist.
    if (!user || user.emailVerified) {
      throw invalidTokenError(ERROR_MESSAGES.INVALID_VERIFICATION_OTP);
    }

    const valid = await this.withRedis(() =>
      this.otps.consume(OTP_PURPOSE.emailVerify, user.id, dto.otp),
    );
    if (!valid) {
      throw invalidTokenError(ERROR_MESSAGES.INVALID_VERIFICATION_OTP);
    }

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    return { user: toPublicUserDto(verified) };
  }

  async resendVerificationEmail(dto: ResendVerificationDto): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });

    // Always behave the same to avoid revealing which emails are registered.
    if (user && !user.emailVerified) {
      await this.queueVerificationEmail(user);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });

    if (!user) return;

    try {
      const otp = await this.otps.issue(OTP_PURPOSE.passwordReset, user.id);
      await enqueuePasswordResetEmail({
        to: user.email,
        name: user.name,
        otp,
      });
    } catch (error) {
      logger.error("Failed to enqueue password reset email", {
        context: "AuthService.forgotPassword",
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });
    if (!user) {
      throw invalidTokenError(ERROR_MESSAGES.INVALID_RESET_OTP);
    }

    // Consuming the code is what makes a reset single-use.
    const valid = await this.withRedis(() =>
      this.otps.consume(OTP_PURPOSE.passwordReset, user.id, dto.otp),
    );
    if (!valid) throw invalidTokenError(ERROR_MESSAGES.INVALID_RESET_OTP);

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { password } });

    // Kill every existing session: whoever knew the old password is out.
    await this.withRedis(() => this.denylist.revokeAllForUser(user.id));
  }
}
