import type { ZodTypeAny } from "zod";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { NOTIFICATION_EVENTS } from "@/config/constants/sockets";
import type { AppSocket } from "@/interfaces/socket.interface";
import {
  Ack,
  AckCallback,
  errorToAck,
  failureAck,
  successAck,
} from "@/sockets/ack";
import { ErrorCode } from "@/utils/errorCodes";

export interface SocketEventOptions<TDto, TResult> {
  socket: AppSocket;
  /** The ack callback the client passed (may be missing). */
  ack: unknown;
  schema: ZodTypeAny;
  payload: unknown;
  successMessage: string;
  action: (dto: TDto) => Promise<TResult>;
}

/**
 * Runs one socket event through the same pipeline every time, so all events
 * behave like HTTP routes:
 *
 *   throttle (token bucket) -> validate (zod) -> run action -> ack
 *
 * Failures are reported through the ack callback; clients that sent no ack
 * get a `socket:error` event instead so errors are never silently lost.
 */
export const handleSocketEvent = async <TDto, TResult>({
  socket,
  ack,
  schema,
  payload,
  successMessage,
  action,
}: SocketEventOptions<TDto, TResult>): Promise<void> => {
  const reply: AckCallback =
    typeof ack === "function"
      ? (ack as AckCallback)
      : (response) => {
          if (!response.success) {
            socket.emit(NOTIFICATION_EVENTS.server.error, response);
          }
        };

  if (!socket.data.bucket.take()) {
    reply(
      failureAck(ERROR_MESSAGES.TOO_MANY_EVENTS, ErrorCode.TOO_MANY_REQUESTS),
    );
    return;
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    reply(
      failureAck(
        parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_FAILED,
        ErrorCode.VALIDATION_ERROR,
      ),
    );
    return;
  }

  let response: Ack;
  try {
    response = successAck(successMessage, await action(parsed.data as TDto));
  } catch (error) {
    response = errorToAck(error);
  }
  reply(response);
};
