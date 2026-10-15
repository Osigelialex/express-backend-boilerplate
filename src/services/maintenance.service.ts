import prisma from "@/config/database";
import { ENV } from "@/config/env";
import { UNVERIFIED_USER_TTL_DAYS } from "@/config/constants/maintenance";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Housekeeping run by the maintenance worker on a schedule. */
export class MaintenanceService {
  /**
   * Deletes accounts that never verified their email within
   * UNVERIFIED_USER_TTL_DAYS. Skipped entirely when verification isn't
   * required, because then "unverified" is a normal, legitimate state.
   * Returns the number of deleted users.
   */
  async purgeUnverifiedUsers(now: Date = new Date()): Promise<number> {
    if (!ENV.REQUIRE_EMAIL_VERIFICATION) return 0;

    const cutoff = new Date(now.getTime() - UNVERIFIED_USER_TTL_DAYS * DAY_MS);
    const { count } = await prisma.user.deleteMany({
      where: { emailVerified: null, createdAt: { lt: cutoff } },
    });
    return count;
  }
}
