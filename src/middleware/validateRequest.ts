import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { ValidationError } from "@/utils/appError";

export type RequestSource = "body" | "params" | "query";

/**
 * Validates one part of the request against a DTO schema:
 *
 *   router.post("/signup", validateRequest(signupDtoSchema), controller.signup);
 *   router.get("/", validateRequest(listUsersQueryDtoSchema, "query"), ...);
 *
 * On success that part of `req` is REPLACED with the parsed DTO, so handlers
 * only ever see validated, trimmed, coerced data with unknown fields stripped.
 * On failure it answers 400 with the first message and the full issue list in
 * `details`.
 */
export const validateRequest = (
  schema: ZodTypeAny,
  source: RequestSource = "body",
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            error.errors[0]?.message || ERROR_MESSAGES.VALIDATION_FAILED,
            error.errors.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          ),
        );
        return;
      }
      next(new ValidationError(ERROR_MESSAGES.INVALID_REQUEST_DATA));
    }
  };
};
