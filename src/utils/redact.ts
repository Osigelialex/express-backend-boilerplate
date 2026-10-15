const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "refreshtoken",
  "accesstoken",
  "otp",
]);

/**
 * Returns a shallow copy of `body` with credentials, tokens and one-time codes
 * masked, so they never reach the logs. Extend SENSITIVE_KEYS (lower-case) as
 * you add secret-bearing fields.
 */
export const redactSensitive = (
  body: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : value,
    ]),
  );
