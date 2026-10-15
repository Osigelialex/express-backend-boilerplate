import { Request, Response, NextFunction } from "express";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";
import { redactSensitive } from "@/utils/redact";

/**
 * One structured log line per finished request (method, url, status,
 * duration, user, request id). 5xx are logged as errors, 4xx as warnings.
 * Request bodies are only logged outside production, with secrets redacted.
 */
export const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const hasBody =
      ENV.NODE_ENV !== "production" && Object.keys(req.body ?? {}).length > 0;

    const logData = {
      context: "HttpRequest",
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startTime,
      ip: req.ip,
      userId: req.user?.userId,
      userAgent: req.get("user-agent"),
      body: hasBody ? redactSensitive(req.body) : undefined,
    };

    if (res.statusCode >= 500) logger.error("Request failed", logData);
    else if (res.statusCode >= 400) logger.warn("Request rejected", logData);
    else logger.info("Request completed", logData);
  });

  next();
};
