import { Router } from "express";
import prisma from "@/config/database";
import { logger } from "@/config/logger";
import { redis } from "@/config/redis";

/**
 * Operational endpoints, mounted at the root (outside /v1 and rate limits):
 *
 *  - GET /health  LIVENESS: "the process is up". Never touches dependencies,
 *                 so an orchestrator won't restart the app because Postgres
 *                 blipped. Used by the Docker HEALTHCHECK.
 *  - GET /ready   READINESS: "I can serve traffic" - checks Postgres and
 *                 Redis. Point load balancers / k8s readiness probes here.
 */
const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get("/ready", async (_req, res) => {
  const checks: Record<string, "ok" | "error"> = {
    database: "ok",
    redis: "ok",
  };

  await Promise.all([
    prisma.$queryRaw`SELECT 1`.catch((error: unknown) => {
      checks.database = "error";
      logger.error("Readiness: database check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }),
    redis.ping().catch((error: unknown) => {
      checks.redis = "error";
      logger.error("Readiness: redis check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }),
  ]);

  const ready = Object.values(checks).every((status) => status === "ok");
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "unavailable",
    checks,
  });
});

export default router;
