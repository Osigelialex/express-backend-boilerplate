import "dotenv/config";
import { Worker } from "bullmq";
import {
  EMAIL_JOB,
  EMAIL_QUEUE_NAME,
  EMAIL_WORKER_CONCURRENCY,
} from "@/config/constants/email";
import { createMailTransport } from "@/config/mailer";
import {
  EmailJobData,
  EmailJobLike,
  MailTransport,
} from "@/interfaces/email.interface";
import { EmailService } from "@/services/email.service";
import { createWorker } from "@/workers/createWorker";

/**
 * Sends the email described by one queue job. Throws on failure so BullMQ
 * retries it with the backoff configured in EMAIL_JOB_OPTIONS. Exported (with
 * the transport injected) so it can be unit tested without Redis.
 */
export const processEmailJob = async (
  job: EmailJobLike,
  transport: MailTransport,
): Promise<void> => {
  const emailService = new EmailService(transport);
  const { to, name, otp } = job.data;

  switch (job.name) {
    case EMAIL_JOB.verification:
      await emailService.sendVerificationEmail(to, name, otp);
      break;
    case EMAIL_JOB.passwordReset:
      await emailService.sendPasswordResetEmail(to, name, otp);
      break;
    default:
      throw new Error(`Unknown email job: ${job.name}`);
  }
};

export const startEmailWorker = (): Worker<EmailJobData> => {
  const transport = createMailTransport();

  return createWorker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    (job) => processEmailJob(job, transport),
    { concurrency: EMAIL_WORKER_CONCURRENCY },
  );
};

// Run directly (`node dist/src/workers/email.worker.js`), not when imported.
if (require.main === module) {
  startEmailWorker();
}
