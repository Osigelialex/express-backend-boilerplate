import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import type Redis from "ioredis";
import { Server } from "socket.io";
import { ENV } from "@/config/env";
import {
  NotificationsPublisher,
  notificationsPublisher,
} from "@/sockets/notifications.publisher";
import { NotificationsNamespace } from "@/sockets/notifications.namespace";

export interface SocketServerOptions {
  publisher?: NotificationsPublisher;
  /**
   * Redis clients for the Socket.IO adapter. Pass them in production/dev so
   * events reach clients connected to OTHER API instances; omit in tests and
   * single-process setups.
   */
  redisAdapter?: { pubClient: Redis; subClient: Redis };
}

export interface SocketServerHandle {
  io: Server;
  /** Detaches publishers and closes the socket server and its HTTP server. */
  close: () => Promise<void>;
}

/**
 * Attaches Socket.IO to the HTTP server and registers every namespace.
 * New namespaces are registered here (see notifications.namespace.ts).
 */
export const attachSocketServer = (
  httpServer: HttpServer,
  options: SocketServerOptions = {},
): SocketServerHandle => {
  const io = new Server(httpServer, {
    cors: { origin: ENV.CORS_ORIGINS, credentials: true },
  });

  if (options.redisAdapter) {
    const { pubClient, subClient } = options.redisAdapter;
    io.adapter(createAdapter(pubClient, subClient));
  }

  const notifications = new NotificationsNamespace(
    options.publisher ?? notificationsPublisher,
  );
  notifications.register(io);

  return {
    io,
    close: () =>
      new Promise<void>((resolve) => {
        notifications.dispose();
        // Also closes the underlying HTTP server and drops open sockets.
        io.close(() => resolve());
      }),
  };
};
