import { Queue } from "bullmq";
import {
  EMAIL_JOB,
  EMAIL_JOB_OPTIONS,
  EMAIL_QUEUE_NAME,
} from "@/config/constants/email";
import { redis } from "@/config/redis";
import { EmailJobData } from "@/interfaces/email.interface";

/**
 * Producer side of the email queue. The API only ENQUEUES; the email worker
 * (workers/email.worker.ts, a separate process) consumes and sends. That keeps
 * requests fast and makes delivery retryable and survivable across restarts.
 *
 * The Queue is created lazily so importing this module has no side effects
 * (and tests that mock it never open a Redis connection).
 */
let queue: Queue<EmailJobData> | undefined;

const getQueue = (): Queue<EmailJobData> => {
  if (!queue) {
    queue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: EMAIL_JOB_OPTIONS,
    });
  }
  return queue;
};

export const enqueueVerificationEmail = async (
  data: EmailJobData,
): Promise<void> => {
  await getQueue().add(EMAIL_JOB.verification, data);
};

export const enqueuePasswordResetEmail = async (
  data: EmailJobData,
): Promise<void> => {
  await getQueue().add(EMAIL_JOB.passwordReset, data);
};

/** Called by the graceful shutdown in src/index.ts. */
export const closeEmailQueue = async (): Promise<void> => {
  await queue?.close();
  queue = undefined;
};
