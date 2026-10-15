import rateLimit, { Options, RateLimitRequestHandler } from "express-rate-limit";
import RedisStore, { RedisReply } from "rate-limit-redis";
import { ENV } from "@/config/env";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { REDIS_KEY_PREFIX } from "@/config/constants/redis";
import { redis } from "@/config/redis";
import { ErrorCode } from "@/utils/errorCodes";

/**
 * Rate limiters. Counters live in Redis so the limit is shared by every API
 * instance (an in-memory store would multiply the limit by the replica
 * count). If Redis is down the request is let through (`passOnStoreError`)
 * rather than turning a cache outage into a full API outage.
 *
 * Disabled under NODE_ENV=test: they'd make the e2e suite flaky.
 */

const buildLimiter = (
  name: string,
  options: Pick<Options, "windowMs" | "limit"> &
    Partial<Pick<Options, "skipSuccessfulRequests">> & { message: string },
): RateLimitRequestHandler => {
  const { message, ...rest } = options;

  return rateLimit({
    ...rest,
    skip: () => ENV.NODE_ENV === "test",
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false, // no X-RateLimit-* headers
    passOnStoreError: true,
    message: { success: false, message, code: ErrorCode.TOO_MANY_REQUESTS },
    ...(ENV.NODE_ENV === "test"
      ? {}
      : {
          store: new RedisStore({
            prefix: `${REDIS_KEY_PREFIX.rateLimit}${name}:`,
            sendCommand: (command: string, ...args: string[]) =>
              redis.call(command, ...args) as Promise<RedisReply>,
          }),
        }),
  });
};

/** Credential endpoints. Only failed attempts count, to slow brute force. */
export const authLimiter = buildLimiter("auth", {
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  message: ERROR_MESSAGES.TOO_MANY_AUTH_ATTEMPTS,
});

/** Everything under /v1. */
export const apiLimiter = buildLimiter("api", {
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
});

/** Endpoints that send an email/OTP: expensive and abusable. */
export const verificationLimiter = buildLimiter("verification", {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: ERROR_MESSAGES.TOO_MANY_VERIFICATION_ATTEMPTS,
});
