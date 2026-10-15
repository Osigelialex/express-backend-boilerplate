import type { Socket } from "socket.io";
import type { UserRole } from "@/interfaces/role.interface";
import type { TokenBucket } from "@/utils/tokenBucket";

/** Per-connection state attached by `authenticateSocket`. */
export interface SocketData {
  userId: string;
  role: UserRole;
  /** Throttles how many events this one socket may emit. */
  bucket: TokenBucket;
}

export type AppSocket = Socket & { data: SocketData };
