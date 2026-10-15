import { Processor, Worker, WorkerOptions } from "bullmq";
import prisma from "@/config/database";
import { logger } from "@/config/logger";
import { createWorkerConnection } from "@/config/redis";

export interface CreateWorkerOptions {
  /** How many jobs this process runs in parallel (default 1). */
  concurrency?: number;
  /** Extra BullMQ worker options (limiter, lockDuration...). */
  workerOptions?: Omit<WorkerOptions, "connection" | "concurrency">;
}

/**
 * Starts a BullMQ worker with the boilerplate every worker needs:
 *  - its own Redis connection (workers use blocking commands);
 *  - completed/failed/error logging;
 *  - graceful shutdown: on SIGTERM/SIGINT it stops taking jobs, waits for the
 *    in-flight ones, then closes Redis and Prisma.
 *
 * Add a new worker by writing a processor and calling:
 *
 *   createWorker<MyJobData>("my-queue", async (job) => { ... }, { concurrency: 5 });
 *
 * and give it a `worker:<name>` script in package.json plus a service in the
 * docker-compose files (copy `email-worker`).
 */
export const createWorker = <T = unknown, R = unknown>(
  queueName: string,
  processor: Processor<T, R>,
  options: CreateWorkerOptions = {},
): Worker<T, R> => {
  const connection = createWorkerConnection();

  const worker = new Worker<T, R>(queueName, processor, {
    ...options.workerOptions,
    connection,
    concurrency: options.concurrency ?? 1,
  });

  worker.on("completed", (job) => {
    logger.info("Job completed", { queue: queueName, jobId: job.id, name: job.name });
  });
  worker.on("failed", (job, error) => {
    logger.error("Job failed", {
      queue: queueName,
      jobId: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  });
  worker.on("error", (error) => {
    logger.error("Worker error", { queue: queueName, error: error.message });
  });

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info(`${signal} received; closing ${queueName} worker`);
    try {
      await worker.close(); // waits for active jobs
      await connection.quit();
      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      logger.error("Error during worker shutdown", {
        queue: queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));

  logger.info(`${queueName} worker started`, {
    concurrency: options.concurrency ?? 1,
  });
  return worker;
};
