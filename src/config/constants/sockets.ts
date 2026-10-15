/** One namespace per feature area, e.g. "/notifications", "/chat". */
export const SOCKET_NAMESPACES = {
  notifications: "/notifications",
} as const;

/** Per-socket event budget: burst size and sustained events per second. */
export const SOCKET_RATE_LIMIT = {
  burst: 10,
  refillPerSecond: 5,
} as const;

export const NOTIFICATION_EVENTS = {
  /** Events the client emits (all support an ack callback). */
  client: {
    ping: "ping",
    joinRoom: "room:join",
    leaveRoom: "room:leave",
    sendMessage: "room:message",
  },
  /** Events the server pushes. */
  server: {
    notification: "notification",
    roomMessage: "room:message",
    profileUpdated: "profile:updated",
    /** Failure envelope for clients that sent no ack callback. */
    error: "socket:error",
  },
} as const;
