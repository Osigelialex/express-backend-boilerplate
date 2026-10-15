import { z } from "zod";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import {
  ROOM_NAME_PATTERN,
  SOCKET_MESSAGE_MAX_LENGTH,
} from "@/config/constants/validation";

/**
 * Payload schemas for Socket.IO events. Sockets get the same validation as
 * HTTP: nothing reaches a handler unless it parsed.
 */

// `socket.emit("ping")` arrives as null (undefined is not JSON), so allow it.
export const pingDtoSchema = z.object({}).passthrough().nullish();

export const roomDtoSchema = z.object({
  room: z.string().regex(ROOM_NAME_PATTERN, ERROR_MESSAGES.INVALID_ROOM_NAME),
});
export type RoomDto = z.infer<typeof roomDtoSchema>;

export const roomMessageDtoSchema = roomDtoSchema.extend({
  text: z.string().trim().min(1).max(SOCKET_MESSAGE_MAX_LENGTH),
});
export type RoomMessageDto = z.infer<typeof roomMessageDtoSchema>;
