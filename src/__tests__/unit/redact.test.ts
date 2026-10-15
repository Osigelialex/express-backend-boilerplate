import { redactSensitive } from "@/utils/redact";

describe("redactSensitive", () => {
  it("masks credentials, tokens and codes but keeps everything else", () => {
    expect(
      redactSensitive({
        email: "a@b.co",
        password: "secret",
        refreshToken: "r",
        AccessToken: "a",
        otp: "123456",
      }),
    ).toEqual({
      email: "a@b.co",
      password: "[REDACTED]",
      refreshToken: "[REDACTED]",
      AccessToken: "[REDACTED]",
      otp: "[REDACTED]",
    });
  });
});
