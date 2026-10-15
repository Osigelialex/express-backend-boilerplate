/**
 * Production seed: creates the initial admin from ADMIN_EMAIL/ADMIN_PASSWORD.
 * Idempotent, so it is safe to run on every deploy.
 *
 * It is compiled by `pnpm build` (production has no ts-node/tsx):
 *   pnpm seed:prod   # node dist/scripts/prod.seed.js
 */
import "dotenv/config";
import prisma from "@/config/database";
import { seedAdmin } from "./lib/seed";

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed");
  }

  const admin = await seedAdmin();
  console.log("Production seed completed:", { admin: admin.email });
}

main()
  .catch((error) => {
    console.error("Error seeding production data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
