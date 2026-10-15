import { REDIS_KEY_PREFIX } from "@/config/constants/redis";
import type { OtpPurpose } from "@/interfaces/otp.interface";

/** Builders for every Redis key, so key shapes live in exactly one place. */

export const refreshDenylistKey = (jti: string): string =>
  `${REDIS_KEY_PREFIX.refreshDenylist}${jti}`;

export const revokedBeforeKey = (userId: string): string =>
  `${REDIS_KEY_PREFIX.revokedBefore}${userId}`;

export const otpKey = (purpose: OtpPurpose, userId: string): string =>
  `${REDIS_KEY_PREFIX.otp}${purpose}:${userId}`;

export const otpAttemptsKey = (purpose: OtpPurpose, userId: string): string =>
  `${REDIS_KEY_PREFIX.otpAttempts}${purpose}:${userId}`;
