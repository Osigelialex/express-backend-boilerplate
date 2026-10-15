/**
 * Every Redis key family used by the app, prefixed so the keyspace stays
 * readable (`redis-cli --scan --pattern 'otp:*'`). Build full keys with the
 * helpers in utils/redisKeys.ts.
 */
export const REDIS_KEY_PREFIX = {
  refreshDenylist: "denylist:refresh:",
  revokedBefore: "revoked-before:",
  otp: "otp:",
  otpAttempts: "otp-attempts:",
  rateLimit: "rl:",
} as const;

export const DENYLIST_MARKER = "1";
