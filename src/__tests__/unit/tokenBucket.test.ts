import { TokenBucket } from "@/utils/tokenBucket";

describe("TokenBucket", () => {
  it("allows a burst then throttles", () => {
    const now = 0;
    const bucket = new TokenBucket(3, 1, () => now);

    expect([bucket.take(), bucket.take(), bucket.take()]).toEqual([
      true,
      true,
      true,
    ]);
    expect(bucket.take()).toBe(false);
  });

  it("refills over time but never beyond capacity", () => {
    let now = 0;
    const bucket = new TokenBucket(2, 1, () => now);
    bucket.take();
    bucket.take();
    expect(bucket.take()).toBe(false);

    now += 1000; // +1 token
    expect(bucket.take()).toBe(true);
    expect(bucket.take()).toBe(false);

    now += 60_000; // far more than capacity
    expect([bucket.take(), bucket.take(), bucket.take()]).toEqual([
      true,
      true,
      false,
    ]);
  });
});
