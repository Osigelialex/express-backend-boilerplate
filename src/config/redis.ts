import Redis from "ioredis";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";

/**
 * Shared Redis connection for the API process: refresh-token denylist, OTPs,
 * rate limiting and the BullMQ producers. It connects lazily on first use.
 *
 * Commands fail fast (instead of queueing forever) when Redis is down so
 * callers can fail closed, e.g. answer 503, rather than hang the request.
 */
export const redis = new Redis(ENV.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

redis.on("error", (error) => {
  logger.error("Redis connection error", { error: error.message });
});

/**
 * BullMQ workers use blocking commands and require `maxRetriesPerRequest:
 * null`, so each worker gets its own dedicated connection.
 */
export const createWorkerConnection = () =>
  new Redis(ENV.REDIS_URL, { maxRetriesPerRequest: null });

/**
 * Socket.IO's Redis adapter needs a publisher and a subscriber connection
 * (a subscribed connection cannot run normal commands).
 */
export const createSocketAdapterClients = () => ({
  pubClient: new Redis(ENV.REDIS_URL, { maxRetriesPerRequest: null }),
  subClient: new Redis(ENV.REDIS_URL, { maxRetriesPerRequest: null }),
});
