import type { Namespace } from "socket.io";
import { NOTIFICATION_EVENTS } from "@/config/constants/sockets";
import { userRoom } from "@/utils/socketRooms";

/**
 * Lets non-socket code (REST services, workers' callbacks) push events to
 * connected clients without importing Socket.IO:
 *
 *   notificationsPublisher.toUser(userId, { type: "order.shipped", ... });
 *
 * Until a socket server is attached it does nothing, so the HTTP app works
 * (and is testable) without one. In a multi-instance deployment the Redis
 * adapter (sockets/index.ts) routes the emit to whichever instance holds the
 * user's connection.
 */
export class NotificationsPublisher {
  private namespace: Namespace | null = null;

  attach(namespace: Namespace): void {
    this.namespace = namespace;
  }

  detach(): void {
    this.namespace = null;
  }

  /** Generic notification to every connected device of one user. */
  toUser(userId: string, payload: Record<string, unknown>): void {
    this.namespace
      ?.to(userRoom(userId))
      .emit(NOTIFICATION_EVENTS.server.notification, payload);
  }

  profileUpdated(userId: string, profile: unknown): void {
    this.namespace
      ?.to(userRoom(userId))
      .emit(NOTIFICATION_EVENTS.server.profileUpdated, profile);
  }
}

/** Process-wide instance shared by REST services and the socket server. */
export const notificationsPublisher = new NotificationsPublisher();
