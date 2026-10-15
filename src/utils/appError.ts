import { ErrorCode } from "@/utils/errorCodes";

/**
 * The error type the whole app throws on purpose. The error middleware turns
 * it into `{ success: false, message, code }` with `statusCode`.
 *
 * `isOperational` separates expected failures (bad input, not found...) from
 * programmer errors: non-operational errors are logged loudly and their
 * message is never sent to the client.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    public readonly isOperational: boolean = true,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace(this, new.target);
  }
}

// Ready-made subclasses for the common cases: `throw new NotFoundError("...")`.

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.FORBIDDEN) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, ErrorCode.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.ALREADY_EXISTS) {
    super(message, 409, code);
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;
