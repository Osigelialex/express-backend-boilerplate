import type { Socket } from "socket.io";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { SOCKET_RATE_LIMIT } from "@/config/constants/sockets";
import type { SocketData } from "@/interfaces/socket.interface";
import { ErrorCode } from "@/utils/errorCodes";
import { TokenBucket } from "@/utils/tokenBucket";
import { verifyAccessToken } from "@/utils/tokens";

/** Error shape Socket.IO sends to the client's `connect_error` handler. */
const handshakeError = (message: string, code: ErrorCode): Error => {
  const error = new Error(message) as Error & { data: { code: ErrorCode } };
  error.data = { code };
  return error;
};

/** Finds the access token in the handshake, in order of preference. */
const extractToken = (socket: Socket): string | undefined => {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth) return fromAuth;

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }

  // For clients that can only set a URL (e.g. Postman Socket.IO requests).
  const fromQuery = socket.handshake.query?.token;
  if (typeof fromQuery === "string" && fromQuery) return fromQuery;

  return undefined;
};

/**
 * Socket.IO middleware that authenticates the connection with the same JWT
 * access token the REST API uses. Register it on every namespace:
 *
 *   namespace.use(authenticateSocket);
 *
 * Client:  io("/notifications", { auth: { token: accessToken } })
 *
 * On success `socket.data` holds { userId, role, bucket }. A refresh token
 * (or any other kind) is rejected by `verifyAccessToken`.
 */
export const authenticateSocket = (
  socket: Socket,
  next: (error?: Error) => void,
): void => {
  const token = extractToken(socket);
  if (!token) {
    next(handshakeError(ERROR_MESSAGES.NO_TOKEN_PROVIDED, ErrorCode.UNAUTHORIZED));
    return;
  }

  try {
    const { userId, role } = verifyAccessToken(token);
    socket.data = {
      userId,
      role,
      bucket: new TokenBucket(
        SOCKET_RATE_LIMIT.burst,
        SOCKET_RATE_LIMIT.refillPerSecond,
      ),
    } satisfies SocketData;
    next();
  } catch {
    next(
      handshakeError(ERROR_MESSAGES.INVALID_ACCESS_TOKEN, ErrorCode.INVALID_TOKEN),
    );
  }
};
