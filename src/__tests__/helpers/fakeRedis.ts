import type Redis from "ioredis";

/**
 * Minimal in-memory stand-in for the ioredis commands the app uses
 * (SET [EX] [NX], GET, DEL, INCR, EXPIRE, EXISTS, MULTI). Lets unit tests
 * exercise Redis-backed services without a Redis server. TTLs are recorded
 * but not enforced; use `ttls` to assert them.
 */
export class FakeRedis {
  readonly store = new Map<string, string>();
  readonly ttls = new Map<string, number>();

  async set(key: string, value: string, ...args: (string | number)[]) {
    const nx = args.includes("NX");
    if (nx && this.store.has(key)) return null;
    this.store.set(key, value);
    const exIndex = args.indexOf("EX");
    if (exIndex >= 0) this.ttls.set(key, Number(args[exIndex + 1]));
    return "OK";
  }

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async del(...keys: string[]) {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed += 1;
      this.ttls.delete(key);
    }
    return removed;
  }

  async exists(key: string) {
    return this.store.has(key) ? 1 : 0;
  }

  async incr(key: string) {
    const next = Number(this.store.get(key) ?? 0) + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number) {
    this.ttls.set(key, seconds);
    return 1;
  }

  /** Supports the chained `.set().del().exec()` used by OtpService.issue. */
  multi() {
    const operations: Array<() => Promise<unknown>> = [];
    const chain = {
      set: (...args: Parameters<FakeRedis["set"]>) => {
        operations.push(() => this.set(...args));
        return chain;
      },
      del: (...keys: string[]) => {
        operations.push(() => this.del(...keys));
        return chain;
      },
      exec: async () => Promise.all(operations.map((operation) => operation())),
    };
    return chain;
  }

  /** Cast helper for constructors that expect an ioredis client. */
  asRedis(): Redis {
    return this as unknown as Redis;
  }
}
