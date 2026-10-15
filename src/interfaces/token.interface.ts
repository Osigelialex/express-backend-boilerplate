import type { UserRole } from "@/interfaces/role.interface";

/** The `typ` claim stops a refresh token being replayed as an access token. */
export type TokenType = "access" | "refresh";

export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: string;
  /** Unique id; the key under which a used/revoked token is denylisted. */
  jti: string;
  iat: number;
  exp: number;
}
