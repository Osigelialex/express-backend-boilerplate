import { Request, Response, NextFunction } from "express";
import { HandleRequestOptions } from "@/interfaces/controller.interface";
import { ApiResponse } from "@/utils/apiResponse";
import { PaginatedResult } from "@/utils/pagination";

/**
 * Base class for controllers. A controller's only jobs are: take the already
 * validated DTO from `req`, call ONE service method, and shape the response.
 * Business rules belong in services.
 *
 * `handleRequest` runs the action, wraps its result in the response envelope
 * and forwards any thrown error to the error middleware. If the action returns
 * a `PaginatedResult` the paginated envelope (with `meta`) is used.
 */
export abstract class BaseController {
  protected async handleRequest<T>(
    _req: Request,
    res: Response,
    next: NextFunction,
    action: () => Promise<T>,
    options: HandleRequestOptions = {},
  ): Promise<void> {
    try {
      const result = await action();

      if (result instanceof PaginatedResult) {
        ApiResponse.paginated(res, result.items, result.meta, options.message);
        return;
      }
      ApiResponse.success(res, result, options.message, options.status);
    } catch (error) {
      next(error);
    }
  }
}
