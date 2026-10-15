/**
 * Development seed: the admin plus a few verified sample users, so pagination
 * and search have something to show. Idempotent (upserts), never deletes.
 *
 *   pnpm seed:dev
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "@/config/database";
import { seedAdmin } from "./lib/seed";

const SAMPLE_PASSWORD = "Password123!";

async function main() {
  const admin = await seedAdmin();
  const password = await bcrypt.hash(SAMPLE_PASSWORD, 10);

  const users = await Promise.all(
    Array.from({ length: 25 }, (_, index) => {
      const n = index + 1;
      const email = `user${n}@example.com`;
      return prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: `Sample User ${n}`,
          email,
          password,
          emailVerified: new Date(),
        },
      });
    }),
  );

  console.log("Development seed completed:", {
    admin: admin.email,
    sampleUsers: users.length,
    samplePassword: SAMPLE_PASSWORD,
  });
}

main()
  .catch((error) => {
    console.error("Error seeding development data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
