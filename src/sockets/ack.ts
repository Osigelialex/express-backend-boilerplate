import { ERROR_MESSAGES } from "@/config/constants/errors";
import { logger } from "@/config/logger";
import { isAppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

/**
 * Socket.IO "acknowledgement" payloads. Same shape as the REST envelope, so
 * clients handle HTTP and WebSocket results with the same code:
 *
 *   socket.emit("room:join", { room: "general" }, (ack) => {
 *     if (!ack.success) console.error(ack.code, ack.message);
 *   });
 */
export interface Ack<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
}

export type AckCallback = (response: Ack) => void;

export const successAck = <T>(message: string, data: T): Ack<T> => ({
  success: true,
  message,
  data,
});

export const failureAck = (message: string, code: ErrorCode): Ack => ({
  success: false,
  message,
  code,
});

/** Maps a thrown error to a client-safe ack; unknown errors are logged. */
export const errorToAck = (error: unknown): Ack => {
  if (isAppError(error) && error.isOperational) {
    return failureAck(error.message, error.code);
  }
  logger.error("Unexpected socket handler error", {
    error: error instanceof Error ? error.message : String(error),
  });
  return failureAck(
    ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    ErrorCode.INTERNAL_SERVER_ERROR,
  );
};
