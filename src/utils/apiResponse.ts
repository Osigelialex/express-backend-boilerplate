import { Response } from "express";
import { SUCCESS_MESSAGES } from "@/config/constants/messages";
import type { PaginationMeta } from "@/utils/pagination";

/**
 * The response envelope every endpoint uses, so clients have one shape to
 * handle (Socket.IO acks reuse it, see sockets/ack.ts):
 *
 *   success:   { success: true,  message, data }
 *   paginated: { success: true,  message, data: [...], meta: {...} }
 *   error:     { success: false, message, code, details?, requestId }
 */
export class ApiResponse {
  static success<T>(
    res: Response,
    data: T | null = null,
    message: string = SUCCESS_MESSAGES.DEFAULT,
    statusCode = 200,
  ): void {
    res.status(statusCode).json({ success: true, message, data });
  }

  static paginated<T>(
    res: Response,
    items: T[],
    meta: PaginationMeta,
    message: string = SUCCESS_MESSAGES.DEFAULT,
  ): void {
    res.status(200).json({ success: true, message, data: items, meta });
  }

  static error(
    res: Response,
    message: string,
    statusCode = 400,
    code?: string,
    details?: unknown,
  ): void {
    res.status(statusCode).json({
      success: false,
      message,
      code,
      details,
      // Lets users quote an id that support can find in the logs.
      requestId: res.req?.requestId,
    });
  }
}
