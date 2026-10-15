import crypto from "crypto";
import type Redis from "ioredis";
import { ENV } from "@/config/env";
import { OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "@/config/constants/auth";
import { redis as sharedRedis } from "@/config/redis";
import type { OtpPurpose } from "@/interfaces/otp.interface";
import { generateOtp } from "@/utils/otp";
import { otpAttemptsKey, otpKey } from "@/utils/redisKeys";

/**
 * Short-lived one-time codes for email verification and password reset.
 *
 * Security properties:
 *  - the code is stored only as an HMAC (keyed by ACTION_TOKEN_SECRET), never
 *    in clear, so a Redis dump can't be replayed;
 *  - it expires on its own (OTP_TTL_SECONDS) and is single-use;
 *  - it locks after OTP_MAX_ATTEMPTS wrong guesses, so 6 digits can't be
 *    brute forced.
 */
export class OtpService {
  constructor(
    private readonly client: Redis = sharedRedis,
    private readonly generate: () => string = generateOtp,
  ) {}

  private hash(purpose: OtpPurpose, userId: string, code: string): string {
    return crypto
      .createHmac("sha256", ENV.ACTION_TOKEN_SECRET)
      .update(`${purpose}:${userId}:${code}`)
      .digest("hex");
  }

  /** Issues a new code, replacing any outstanding one, and returns it. */
  async issue(purpose: OtpPurpose, userId: string): Promise<string> {
    const code = this.generate();
    await this.client
      .multi()
      .set(
        otpKey(purpose, userId),
        this.hash(purpose, userId, code),
        "EX",
        OTP_TTL_SECONDS,
      )
      .del(otpAttemptsKey(purpose, userId))
      .exec();
    return code;
  }

  /** True only for the single caller that presents the correct, unexpired code. */
  async consume(
    purpose: OtpPurpose,
    userId: string,
    code: string,
  ): Promise<boolean> {
    const codeKey = otpKey(purpose, userId);
    const attemptsKey = otpAttemptsKey(purpose, userId);

    const attempts = await this.client.incr(attemptsKey);
    if (attempts === 1) await this.client.expire(attemptsKey, OTP_TTL_SECONDS);
    if (attempts > OTP_MAX_ATTEMPTS) {
      await this.client.del(codeKey, attemptsKey);
      return false;
    }

    const stored = await this.client.get(codeKey);
    if (!stored) return false;

    const expected = Buffer.from(stored, "hex");
    const actual = Buffer.from(this.hash(purpose, userId, code), "hex");
    if (
      expected.length !== actual.length ||
      !crypto.timingSafeEqual(expected, actual)
    ) {
      return false;
    }

    // DEL reports 1 for exactly one concurrent caller, so a code is single-use.
    const removed = await this.client.del(codeKey);
    await this.client.del(attemptsKey);
    return removed === 1;
  }
}
