import { Prisma } from "@prisma/client";
import { PRISMA_UNIQUE_VIOLATION_CODE } from "@/config/constants/auth";

/** True when a write failed because it violated a unique constraint (P2002). */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === PRISMA_UNIQUE_VIOLATION_CODE;
