import jwt from "jsonwebtoken";
import {
  durationToSeconds,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/utils/tokens";

describe("tokens", () => {
  it("round-trips an access token", () => {
    const token = signAccessToken({ userId: "u1", role: "admin" });
    expect(verifyAccessToken(token)).toMatchObject({ userId: "u1", role: "admin" });
  });

  it("round-trips a refresh token with a unique jti", () => {
    const a = verifyRefreshToken(signRefreshToken("u1"));
    const b = verifyRefreshToken(signRefreshToken("u1"));
    expect(a.userId).toBe("u1");
    expect(a.jti).toBeTruthy();
    expect(a.jti).not.toBe(b.jti);
  });

  it("never accepts a refresh token as an access token (or vice versa)", () => {
    expect(() => verifyAccessToken(signRefreshToken("u1"))).toThrow();
    expect(() =>
      verifyRefreshToken(signAccessToken({ userId: "u1", role: "user" })),
    ).toThrow();
  });

  it("rejects tampered and foreign-secret tokens", () => {
    const token = signAccessToken({ userId: "u1", role: "user" });
    expect(() => verifyAccessToken(`${token}x`)).toThrow();

    const foreign = jwt.sign({ userId: "u1", typ: "access" }, "another-secret");
    expect(() => verifyAccessToken(foreign)).toThrow();
  });

  it("converts durations to seconds", () => {
    expect(durationToSeconds("30s")).toBe(30);
    expect(durationToSeconds("15m")).toBe(900);
    expect(durationToSeconds("2h")).toBe(7200);
    expect(durationToSeconds("7d")).toBe(604800);
    expect(() => durationToSeconds("soon")).toThrow();
  });
});
