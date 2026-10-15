import type { Namespace, Server } from "socket.io";
import {
  NOTIFICATION_EVENTS,
  SOCKET_NAMESPACES,
} from "@/config/constants/sockets";
import { SUCCESS_MESSAGES } from "@/config/constants/messages";
import {
  pingDtoSchema,
  roomDtoSchema,
  roomMessageDtoSchema,
  type RoomDto,
  type RoomMessageDto,
} from "@/dtos/socket.dto";
import type { AppSocket } from "@/interfaces/socket.interface";
import { ForbiddenError } from "@/utils/appError";
import { authenticateSocket } from "@/sockets/authenticateSocket";
import { handleSocketEvent } from "@/sockets/handleSocketEvent";
import type { NotificationsPublisher } from "@/sockets/notifications.publisher";
import { namedRoom, userRoom } from "@/utils/socketRooms";

const EVENTS = NOTIFICATION_EVENTS;

/**
 * The `/notifications` namespace - a worked example of a socket feature:
 *
 *  - handshake is authenticated with the REST access token;
 *  - every connection auto-joins a private `user:<id>` room, which is how the
 *    server (via NotificationsPublisher) pushes to all of a user's devices;
 *  - clients can join named rooms and message them (a minimal chat);
 *  - each event is throttled, validated and acked by `handleSocketEvent`.
 *
 * Copy this file to add another namespace (e.g. `chat.namespace.ts`) and
 * register it in sockets/index.ts.
 */
export class NotificationsNamespace {
  private namespace!: Namespace;

  constructor(private readonly publisher: NotificationsPublisher) {}

  register(io: Server): void {
    this.namespace = io.of(SOCKET_NAMESPACES.notifications);
    this.publisher.attach(this.namespace);

    this.namespace.use(authenticateSocket);
    this.namespace.on("connection", (socket) =>
      this.onConnection(socket as AppSocket),
    );
  }

  dispose(): void {
    this.publisher.detach();
  }

  private onConnection(socket: AppSocket): void {
    // Private room for server -> user pushes (all devices/tabs).
    void socket.join(userRoom(socket.data.userId));

    socket.on(EVENTS.client.ping, (payload, ack) =>
      handleSocketEvent({
        socket,
        ack,
        payload,
        schema: pingDtoSchema,
        successMessage: SUCCESS_MESSAGES.PONG,
        action: async () => ({ at: new Date().toISOString() }),
      }),
    );

    socket.on(EVENTS.client.joinRoom, (payload, ack) =>
      handleSocketEvent({
        socket,
        ack,
        payload,
        schema: roomDtoSchema,
        successMessage: SUCCESS_MESSAGES.ROOM_JOINED,
        action: async (dto: RoomDto) => {
          await socket.join(namedRoom(dto.room));
          return { room: dto.room };
        },
      }),
    );

    socket.on(EVENTS.client.leaveRoom, (payload, ack) =>
      handleSocketEvent({
        socket,
        ack,
        payload,
        schema: roomDtoSchema,
        successMessage: SUCCESS_MESSAGES.ROOM_LEFT,
        action: async (dto: RoomDto) => {
          await socket.leave(namedRoom(dto.room));
          return { room: dto.room };
        },
      }),
    );

    socket.on(EVENTS.client.sendMessage, (payload, ack) =>
      handleSocketEvent({
        socket,
        ack,
        payload,
        schema: roomMessageDtoSchema,
        successMessage: SUCCESS_MESSAGES.MESSAGE_SENT,
        action: async (dto: RoomMessageDto) => {
          // Authorisation: you can only speak in rooms you have joined.
          if (!socket.rooms.has(namedRoom(dto.room))) {
            throw new ForbiddenError("Join the room before sending messages");
          }

          const message = {
            room: dto.room,
            from: socket.data.userId,
            text: dto.text,
            at: new Date().toISOString(),
          };
          this.namespace
            .to(namedRoom(dto.room))
            .emit(EVENTS.server.roomMessage, message);
          return message;
        },
      }),
    );
  }
}
