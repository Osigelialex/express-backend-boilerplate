import { ERROR_MESSAGES } from "@/config/constants/errors";
import {
  AppError,
  ConflictError,
  UnauthorizedError,
} from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

export const emailTakenError = (): AppError =>
  new ConflictError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);

export const invalidTokenError = (message: string): AppError =>
  new AppError(message, 400, ErrorCode.INVALID_TOKEN);

export const invalidRefreshTokenError = (): AppError =>
  new UnauthorizedError(
    ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
    ErrorCode.INVALID_TOKEN,
  );

export const serviceUnavailableError = (): AppError =>
  new AppError(
    ERROR_MESSAGES.SERVICE_UNAVAILABLE,
    503,
    ErrorCode.SERVICE_UNAVAILABLE,
  );
