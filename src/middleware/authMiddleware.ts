import { Request, Response, NextFunction } from "express";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { logger } from "@/config/logger";
import { UnauthorizedError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";
import { verifyAccessToken } from "@/utils/tokens";

/**
 * Authenticates a request from `Authorization: Bearer <access token>` and
 * sets `req.user`. Stateless: it only verifies the JWT signature/expiry, so
 * it never touches the database or Redis.
 *
 * Mount it per router (`router.use(requireAuth)`) or per route.
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    next(
      new UnauthorizedError(ERROR_MESSAGES.NO_TOKEN_PROVIDED, ErrorCode.UNAUTHORIZED),
    );
    return;
  }

  try {
    const { userId, role } = verifyAccessToken(token);
    req.user = { userId, role };
    next();
  } catch (error) {
    logger.warn("Invalid access token", {
      context: "AuthMiddleware.requireAuth",
      requestId: req.requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next(
      new UnauthorizedError(
        ERROR_MESSAGES.INVALID_ACCESS_TOKEN,
        ErrorCode.INVALID_TOKEN,
      ),
    );
  }
};
