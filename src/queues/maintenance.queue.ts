import { Queue } from "bullmq";
import {
  MAINTENANCE_JOB,
  MAINTENANCE_QUEUE_NAME,
  PURGE_UNVERIFIED_USERS_CRON,
} from "@/config/constants/maintenance";
import { createWorkerConnection } from "@/config/redis";

/**
 * Scheduled (cron) jobs. Unlike the email queue nothing in the API enqueues
 * here: the maintenance worker registers the schedules itself when it boots.
 *
 * `upsertJobScheduler` is idempotent, so starting several worker replicas (or
 * restarting one) never creates duplicate schedules.
 *
 * To add a recurring job: add a name to MAINTENANCE_JOB, schedule it below and
 * handle it in workers/maintenance.worker.ts.
 */
export const registerMaintenanceSchedules = async (): Promise<void> => {
  const queue = new Queue(MAINTENANCE_QUEUE_NAME, {
    connection: createWorkerConnection(),
  });

  try {
    await queue.upsertJobScheduler(
      MAINTENANCE_JOB.purgeUnverifiedUsers,
      { pattern: PURGE_UNVERIFIED_USERS_CRON },
      {
        name: MAINTENANCE_JOB.purgeUnverifiedUsers,
        opts: { removeOnComplete: true, removeOnFail: { count: 100 } },
      },
    );
  } finally {
    await queue.close();
  }
};
