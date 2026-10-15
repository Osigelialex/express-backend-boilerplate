import { OTP_MAX_ATTEMPTS } from "@/config/constants/auth";
import { OtpService } from "@/services/otp.service";
import { TokenDenylist } from "@/services/tokenDenylist.service";
import { FakeRedis } from "@/__tests__/helpers/fakeRedis";

describe("OtpService", () => {
  const setup = () => {
    const redis = new FakeRedis();
    const service = new OtpService(redis.asRedis(), () => "123456");
    return { redis, service };
  };

  it("accepts the issued code exactly once", async () => {
    const { service } = setup();
    const code = await service.issue("email_verify", "u1");

    expect(await service.consume("email_verify", "u1", code)).toBe(true);
    expect(await service.consume("email_verify", "u1", code)).toBe(false);
  });

  it("stores only a hash of the code", async () => {
    const { service, redis } = setup();
    await service.issue("email_verify", "u1");

    expect([...redis.store.values()]).not.toContain("123456");
  });

  it("rejects a wrong code and a code issued for another purpose", async () => {
    const { service } = setup();
    await service.issue("email_verify", "u1");

    expect(await service.consume("email_verify", "u1", "000000")).toBe(false);
    expect(await service.consume("password_reset", "u1", "123456")).toBe(false);
  });

  it("locks after too many wrong attempts, even for the right code", async () => {
    const { service } = setup();
    await service.issue("password_reset", "u1");

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      await service.consume("password_reset", "u1", "000000");
    }
    expect(await service.consume("password_reset", "u1", "123456")).toBe(false);
  });

  it("a newer code replaces the previous one", async () => {
    const redis = new FakeRedis();
    let next = "111111";
    const service = new OtpService(redis.asRedis(), () => next);

    await service.issue("email_verify", "u1");
    next = "222222";
    await service.issue("email_verify", "u1");

    expect(await service.consume("email_verify", "u1", "111111")).toBe(false);
    expect(await service.consume("email_verify", "u1", "222222")).toBe(true);
  });
});

describe("TokenDenylist", () => {
  const future = () => Math.floor(Date.now() / 1000) + 600;

  it("lets only the first caller deny a refresh token (atomic rotation)", async () => {
    const denylist = new TokenDenylist(new FakeRedis().asRedis());

    expect(await denylist.denyRefresh("jti-1", future())).toBe(true);
    expect(await denylist.denyRefresh("jti-1", future())).toBe(false);
    expect(await denylist.isRefreshDenied("jti-1")).toBe(true);
    expect(await denylist.isRefreshDenied("jti-2")).toBe(false);
  });

  it("does not store already-expired tokens", async () => {
    const denylist = new TokenDenylist(new FakeRedis().asRedis());
    expect(await denylist.denyRefresh("old", Math.floor(Date.now() / 1000) - 1)).toBe(
      false,
    );
  });

  it("revokes every token issued before the revocation", async () => {
    const denylist = new TokenDenylist(new FakeRedis().asRedis());
    const now = Math.floor(Date.now() / 1000);

    expect(await denylist.isUserRevokedSince("u1", now)).toBe(false);
    await denylist.revokeAllForUser("u1");
    expect(await denylist.isUserRevokedSince("u1", now - 10)).toBe(true);
    expect(await denylist.isUserRevokedSince("u1", now + 10)).toBe(false);
    expect(await denylist.isUserRevokedSince("someone-else", now - 10)).toBe(false);
  });
});
