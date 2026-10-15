import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { ENV } from "@/config/env";
import {
  DURATION_PATTERN,
  DURATION_UNIT_SECONDS,
  TOKEN_TYPE,
} from "@/config/constants/auth";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenType,
} from "@/interfaces/token.interface";

/**
 * JWT helpers. Two token kinds, signed with DIFFERENT secrets and tagged with
 * a `typ` claim, so one can never be accepted in place of the other:
 *
 *  - access token:  short lived (JWT_EXPIRY), sent as `Authorization: Bearer`.
 *  - refresh token: long lived (REFRESH_TOKEN_EXPIRY), exchanged for a new
 *    pair at POST /v1/auth/refresh. Carries a unique `jti` so it can be
 *    rotated/denylisted (see services/tokenDenylist.service.ts).
 */

const sign = (
  payload: Record<string, unknown>,
  typ: TokenType,
  secret: string,
  expiresIn: string,
  options: SignOptions = {},
): string =>
  jwt.sign({ ...payload, typ }, secret, {
    ...options,
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });

const verify = <T>(token: string, typ: TokenType, secret: string): T => {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string" || decoded.typ !== typ) {
    throw new jwt.JsonWebTokenError("Wrong token type");
  }
  return decoded as T;
};

export const signAccessToken = (payload: AccessTokenPayload): string =>
  sign({ ...payload }, TOKEN_TYPE.access, ENV.JWT_SECRET, ENV.JWT_EXPIRY);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  verify<AccessTokenPayload>(token, TOKEN_TYPE.access, ENV.JWT_SECRET);

export const signRefreshToken = (userId: string): string =>
  sign(
    { userId },
    TOKEN_TYPE.refresh,
    ENV.REFRESH_TOKEN_SECRET,
    ENV.REFRESH_TOKEN_EXPIRY,
    { jwtid: crypto.randomUUID() },
  );

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  verify<RefreshTokenPayload>(
    token,
    TOKEN_TYPE.refresh,
    ENV.REFRESH_TOKEN_SECRET,
  );

/** Converts strings like "15m" / "7d" (the format enforced in env.ts) to seconds. */
export const durationToSeconds = (duration: string): number => {
  const match = DURATION_PATTERN.exec(duration);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  return Number(match[1]) * DURATION_UNIT_SECONDS[match[2]];
};
