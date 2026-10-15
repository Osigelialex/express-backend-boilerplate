import { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { logger } from "@/config/logger";
import { ApiResponse } from "@/utils/apiResponse";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

/**
 * Turns anything thrown (or passed to `next(err)`) into a safe AppError.
 * Operational errors keep their message; everything unexpected becomes a
 * generic 500 so internals never leak to clients.
 */
export const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;

  // Prisma: translate the common database failures into HTTP semantics.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new ConflictError(ERROR_MESSAGES.RESOURCE_ALREADY_EXISTS);
    }
    if (error.code === "P2025") {
      return new NotFoundError(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
    }
    return new AppError(
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      500,
      ErrorCode.DB_ERROR,
      false,
    );
  }

  // body-parser (express.json) failures carry a `type`.
  const type = (error as { type?: string } | null)?.type;
  if (type === "entity.parse.failed") {
    return new ValidationError(ERROR_MESSAGES.MALFORMED_JSON);
  }
  if (type === "entity.too.large") {
    return new AppError(
      ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
      413,
      ErrorCode.PAYLOAD_TOO_LARGE,
    );
  }

  return new AppError(
    ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    500,
    ErrorCode.INTERNAL_SERVER_ERROR,
    false,
  );
};

/** Last middleware in app.ts. Express recognises it by its 4 parameters. */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalized = normalizeError(error);

  const logData = {
    context: "ErrorHandler",
    requestId: req.requestId,
    statusCode: normalized.statusCode,
    code: normalized.code,
    // Stack only for real failures; 4xx are the client's problem.
    ...(normalized.statusCode >= 500 && {
      stack: error instanceof Error ? error.stack : undefined,
    }),
  };
  if (normalized.statusCode >= 500) logger.error(normalized.message, logData);
  else logger.warn(normalized.message, logData);

  ApiResponse.error(
    res,
    normalized.message,
    normalized.statusCode,
    normalized.code,
    normalized.details,
  );
};
