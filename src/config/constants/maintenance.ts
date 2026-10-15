export const MAINTENANCE_QUEUE_NAME = "maintenance";

export const MAINTENANCE_JOB = {
  purgeUnverifiedUsers: "purge-unverified-users",
} as const;

/** Cron (server time): every day at 03:00. */
export const PURGE_UNVERIFIED_USERS_CRON = "0 3 * * *";

/** Accounts that never verified their email are deleted after this long. */
export const UNVERIFIED_USER_TTL_DAYS = 7;
