import { PrismaClient } from "@prisma/client";
import { ENV } from "@/config/env";

/**
 * The one and only PrismaClient. Import it from here
 * (`import prisma from "@/config/database"`) and never call
 * `new PrismaClient()` elsewhere, so the process holds a single connection
 * pool.
 *
 * It is cached on globalThis so dev reloads and jest module registries reuse
 * the same client instead of opening additional pools. Disconnecting is done
 * by the graceful shutdown in src/index.ts (and workers/createWorker.ts).
 *
 * The connection string comes from DATABASE_URL via prisma/schema.prisma.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ENV.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;

export default prisma;
