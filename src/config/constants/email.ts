export const EMAIL_QUEUE_NAME = "email";

export const EMAIL_JOB = {
  verification: "verification",
  passwordReset: "password-reset",
} as const;

/** Retry with exponential backoff; keep failures for a week for debugging. */
export const EMAIL_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: true,
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 1000 },
} as const;

export const EMAIL_WORKER_CONCURRENCY = 5;

export const EMAIL_SUBJECTS = {
  verification: "Verify your email address",
  passwordReset: "Reset your password",
} as const;
