import bcrypt from "bcrypt";
import prisma from "@/config/database";

const SEED_BCRYPT_ROUNDS = 10;
const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_DEV_ADMIN_PASSWORD = "Password123!";

/**
 * Idempotently creates (or promotes) the initial admin, keyed by email.
 * Safe to run on every deploy: re-running never creates duplicates and never
 * resets an existing admin's password.
 */
export const seedAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const plain = process.env.ADMIN_PASSWORD || DEFAULT_DEV_ADMIN_PASSWORD;
  const password = await bcrypt.hash(plain, SEED_BCRYPT_ROUNDS);

  return prisma.user.upsert({
    where: { email },
    update: { role: "admin", emailVerified: new Date() },
    create: {
      name: "Admin",
      email,
      password,
      role: "admin",
      emailVerified: new Date(),
    },
  });
};
