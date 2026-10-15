import app from "@/app";
import prisma from "@/config/database";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";
import { createSocketAdapterClients, redis } from "@/config/redis";
import { closeEmailQueue } from "@/queues/email.queue";
import { attachSocketServer } from "@/sockets";

/**
 * Process entrypoint: starts the HTTP server, attaches Socket.IO and wires
 * graceful shutdown. Background work (email, maintenance) runs in separate
 * worker processes - see src/workers.
 */
const server = app.listen(ENV.PORT, () => {
  logger.info(`Server running on port ${ENV.PORT} in ${ENV.NODE_ENV} mode`);
});

// Socket.IO shares the HTTP server. The Redis adapter lets several API
// instances broadcast to each other's clients.
const adapterClients = createSocketAdapterClients();
const sockets = attachSocketServer(server, { redisAdapter: adapterClients });

let isShuttingDown = false;

const shutdown = async (signal: string, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${signal} received; shutting down`);

  // Don't hang forever on a stuck connection (Docker kills after 10s anyway).
  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    await sockets.close(); // stops accepting + closes HTTP server
    await closeEmailQueue();
    await Promise.allSettled([
      adapterClients.pubClient.quit(),
      adapterClients.subClient.quit(),
      redis.quit(),
    ]);
    await prisma.$disconnect();
    logger.info("HTTP server and connections closed");
    process.exit(exitCode);
  } catch (error) {
    logger.error("Error during shutdown", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Last-resort safety nets: log, then restart cleanly via the orchestrator.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.stack : String(reason),
  });
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.stack });
  void shutdown("uncaughtException", 1);
});

export default server;
