import { Request, Response } from "express";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { ErrorCode } from "@/utils/errorCodes";
import { ApiResponse } from "@/utils/apiResponse";

/** Mounted after all routes: anything that reaches it matched nothing. */
export const notFoundHandler = (_req: Request, res: Response) => {
  ApiResponse.error(
    res,
    ERROR_MESSAGES.ROUTE_NOT_FOUND,
    404,
    ErrorCode.NOT_FOUND,
  );
};
