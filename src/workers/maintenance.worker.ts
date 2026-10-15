import "dotenv/config";
import { Worker } from "bullmq";
import {
  MAINTENANCE_JOB,
  MAINTENANCE_QUEUE_NAME,
} from "@/config/constants/maintenance";
import { logger } from "@/config/logger";
import { registerMaintenanceSchedules } from "@/queues/maintenance.queue";
import { MaintenanceService } from "@/services/maintenance.service";
import { createWorker } from "@/workers/createWorker";

/**
 * Runs one scheduled maintenance job. Exported (service injected) so it can
 * be unit tested without Redis.
 */
export const processMaintenanceJob = async (
  jobName: string,
  service: MaintenanceService = new MaintenanceService(),
): Promise<void> => {
  switch (jobName) {
    case MAINTENANCE_JOB.purgeUnverifiedUsers: {
      const deleted = await service.purgeUnverifiedUsers();
      logger.info("Purged unverified users", { deleted });
      break;
    }
    default:
      throw new Error(`Unknown maintenance job: ${jobName}`);
  }
};

export const startMaintenanceWorker = async (): Promise<Worker> => {
  await registerMaintenanceSchedules();
  return createWorker(MAINTENANCE_QUEUE_NAME, (job) =>
    processMaintenanceJob(job.name),
  );
};

if (require.main === module) {
  startMaintenanceWorker().catch((error) => {
    logger.error("Failed to start maintenance worker", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
}
