import cors from "cors";
import express from "express";
import { API_VERSION_PREFIX } from "@/config/api";
import { ENV } from "@/config/env";
import { errorHandler } from "@/middleware/errorHandler";
import { loggingMiddleware } from "@/middleware/loggingMiddleware";
import { notFoundHandler } from "@/middleware/notFound";
import { compressionMiddleware } from "@/middleware/performanceMiddleware";
import {
  apiLimiter,
  authLimiter,
} from "@/middleware/rateLimiter";
import { requestId } from "@/middleware/requestId";
import { setupSecurityHeaders } from "@/middleware/securityHeaders";
import healthRoutes from "@/routes/health.routes";
import v1Routes from "@/routes/v1";

/**
 * The Express application. It is created here but NOT started: src/index.ts
 * calls `listen` (and attaches Socket.IO), and tests import `app` directly
 * with supertest.
 *
 * Request flow:
 *   requestId -> security headers -> CORS -> compression -> body parser ->
 *   request logging -> health -> rate limits -> /v1 routes -> 404 -> errors
 *   route:  validateRequest(dto) -> controller -> service -> Prisma
 */
const app = express();

// Behind a reverse proxy, trust its X-Forwarded-* headers so `req.ip` (and
// therefore rate limiting) sees the real client. Set TRUST_PROXY to the number
// of proxies in front of the app.
if (ENV.TRUST_PROXY > 0) {
  app.set("trust proxy", ENV.TRUST_PROXY);
}

// Observability + security
app.use(requestId);
setupSecurityHeaders(app);
app.use(cors({ origin: ENV.CORS_ORIGINS, credentials: true }));

// Performance + parsing. The small body limit is deliberate; raise it per
// route if you accept uploads.
app.use(compressionMiddleware);
app.use(express.json({ limit: "100kb" }));

app.use(loggingMiddleware);

// Liveness/readiness probes: before rate limiting so monitors never get 429.
app.use(healthRoutes);

app.get("/", (_req, res) => {
  res.json({ name: ENV.APP_NAME, status: "ok" });
});

// Rate limiting (order matters: the stricter auth limiter is mounted first).
app.use(`${API_VERSION_PREFIX}/auth`, authLimiter);
app.use(API_VERSION_PREFIX, apiLimiter);

app.use(API_VERSION_PREFIX, v1Routes);

// Anything unmatched, then the single place errors are turned into responses.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
