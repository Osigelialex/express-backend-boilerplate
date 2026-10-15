import type Redis from "ioredis";
import { ENV } from "@/config/env";
import { DENYLIST_MARKER } from "@/config/constants/redis";
import { redis as sharedRedis } from "@/config/redis";
import { refreshDenylistKey, revokedBeforeKey } from "@/utils/redisKeys";
import { durationToSeconds } from "@/utils/tokens";

/**
 * Redis-backed denylist for refresh tokens. This is the only server-side auth
 * state (access tokens are stateless JWTs); every key carries a TTL so the
 * list cleans itself up.
 */
export class TokenDenylist {
  constructor(private readonly client: Redis = sharedRedis) {}

  /**
   * Denylist a refresh token id until the token's own expiry (unix seconds).
   * Returns true only for the caller that actually added it, which makes
   * refresh-token rotation atomic: concurrent uses of one token cannot both win.
   */
  async denyRefresh(jti: string, expUnixSeconds: number): Promise<boolean> {
    const ttl = expUnixSeconds - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return false;
    const result = await this.client.set(
      refreshDenylistKey(jti),
      DENYLIST_MARKER,
      "EX",
      ttl,
      "NX",
    );
    return result === "OK";
  }

  async isRefreshDenied(jti: string): Promise<boolean> {
    return (await this.client.exists(refreshDenylistKey(jti))) === 1;
  }

  /**
   * Invalidate every refresh token issued to the user up to now (e.g. after a
   * password reset). Tokens issued in the same second are also rejected.
   */
  async revokeAllForUser(userId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.client.set(
      revokedBeforeKey(userId),
      String(now),
      "EX",
      durationToSeconds(ENV.REFRESH_TOKEN_EXPIRY),
    );
  }

  async isUserRevokedSince(userId: string, issuedAt: number): Promise<boolean> {
    const value = await this.client.get(revokedBeforeKey(userId));
    return value !== null && issuedAt <= Number(value);
  }
}
