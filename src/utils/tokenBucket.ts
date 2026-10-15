/**
 * Classic token bucket: `capacity` burst, refilled at `refillPerSecond`.
 * Used to throttle Socket.IO events per connection (HTTP routes use
 * express-rate-limit instead, see middleware/rateLimiter.ts).
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.lastRefill = now();
  }

  /** Spends one token; false when the bucket is empty. */
  take(): boolean {
    const current = this.now();
    const elapsedSeconds = (current - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSeconds * this.refillPerSecond,
    );
    this.lastRefill = current;

    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}
