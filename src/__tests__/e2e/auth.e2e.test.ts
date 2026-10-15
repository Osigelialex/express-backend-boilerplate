import request from "supertest";
import app from "@/app";
import prisma from "@/config/database";
import {
  enqueuePasswordResetEmail,
  enqueueVerificationEmail,
} from "@/queues/email.queue";
import {
  TEST_PASSWORD,
  bearer,
  createTestUser,
  loginAs,
} from "@/__tests__/helpers/user.helper";

const signupBody = {
  name: "Jane Doe",
  email: "Jane@Example.com", // mixed case on purpose: emails are normalised
  password: TEST_PASSWORD,
};

/** The OTP the API handed to the (mocked) email queue. */
const lastOtp = (mock: unknown): string => {
  const { calls } = (mock as jest.Mock).mock;
  return calls[calls.length - 1][0].otp;
};

describe("auth", () => {
  describe("signup -> verify -> login", () => {
    it("runs the whole happy path", async () => {
      const signup = await request(app).post("/v1/auth/signup").send(signupBody);
      expect(signup.status).toBe(201);
      expect(signup.body).toMatchObject({
        success: true,
        data: {
          user: { email: "jane@example.com", role: "user", emailVerified: false },
        },
      });
      expect(signup.body.data.user.password).toBeUndefined();

      // Unverified accounts cannot log in yet.
      const early = await request(app)
        .post("/v1/auth/login")
        .send({ email: signupBody.email, password: TEST_PASSWORD });
      expect(early.status).toBe(403);
      expect(early.body.code).toBe("ERR_1005");

      const otp = lastOtp(enqueueVerificationEmail);
      const verify = await request(app)
        .post("/v1/auth/verify-email")
        .send({ email: signupBody.email, otp });
      expect(verify.status).toBe(200);
      expect(verify.body.data.user.emailVerified).toBe(true);

      const tokens = await loginAs(signupBody.email);
      const me = await request(app)
        .get("/v1/users/me")
        .set(bearer(tokens.accessToken));
      expect(me.status).toBe(200);
      expect(me.body.data.email).toBe("jane@example.com");
    });

    it("rejects duplicate emails, weak passwords and bad bodies", async () => {
      await request(app).post("/v1/auth/signup").send(signupBody).expect(201);

      const duplicate = await request(app)
        .post("/v1/auth/signup")
        .send({ ...signupBody, email: "jane@example.com" });
      expect(duplicate.status).toBe(409);

      const weak = await request(app)
        .post("/v1/auth/signup")
        .send({ ...signupBody, email: "x@example.com", password: "password" });
      expect(weak.status).toBe(400);
      expect(weak.body.code).toBe("ERR_3001");
      expect(weak.body.details[0].field).toBe("password");

      await request(app).post("/v1/auth/signup").send({}).expect(400);
    });

    it("rejects a wrong or reused verification code", async () => {
      await request(app).post("/v1/auth/signup").send(signupBody).expect(201);
      const otp = lastOtp(enqueueVerificationEmail);

      await request(app)
        .post("/v1/auth/verify-email")
        .send({ email: signupBody.email, otp: otp === "000000" ? "111111" : "000000" })
        .expect(400);

      await request(app)
        .post("/v1/auth/verify-email")
        .send({ email: signupBody.email, otp })
        .expect(200);
      await request(app)
        .post("/v1/auth/verify-email")
        .send({ email: signupBody.email, otp })
        .expect(400);
    });
  });

  describe("login", () => {
    it("gives the same answer for a wrong password and an unknown email", async () => {
      const user = await createTestUser();

      const wrongPassword = await request(app)
        .post("/v1/auth/login")
        .send({ email: user.email, password: "Wrong123!" });
      const unknown = await request(app)
        .post("/v1/auth/login")
        .send({ email: "nobody@example.com", password: "Wrong123!" });

      expect(wrongPassword.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(unknown.body.message).toBe(wrongPassword.body.message);
    });
  });

  describe("refresh + logout", () => {
    it("rotates refresh tokens and rejects reuse", async () => {
      const user = await createTestUser();
      const first = await loginAs(user.email);

      const rotated = await request(app)
        .post("/v1/auth/refresh")
        .send({ refreshToken: first.refreshToken });
      expect(rotated.status).toBe(200);
      expect(rotated.body.data.refreshToken).not.toBe(first.refreshToken);

      const reuse = await request(app)
        .post("/v1/auth/refresh")
        .send({ refreshToken: first.refreshToken });
      expect(reuse.status).toBe(401);
    });

    it("logout invalidates the refresh token", async () => {
      const user = await createTestUser();
      const tokens = await loginAs(user.email);

      await request(app)
        .post("/v1/auth/logout")
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);
      await request(app)
        .post("/v1/auth/refresh")
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });

    it("does not accept an access token as a refresh token", async () => {
      const user = await createTestUser();
      const tokens = await loginAs(user.email);

      await request(app)
        .post("/v1/auth/refresh")
        .send({ refreshToken: tokens.accessToken })
        .expect(401);
    });
  });

  describe("password reset", () => {
    it("resets the password and revokes existing sessions", async () => {
      const user = await createTestUser();
      const session = await loginAs(user.email);

      await request(app)
        .post("/v1/auth/forgot-password")
        .send({ email: user.email })
        .expect(200);
      const otp = lastOtp(enqueuePasswordResetEmail);

      await request(app)
        .post("/v1/auth/reset-password")
        .send({ email: user.email, otp, password: "NewPassword456!" })
        .expect(200);

      // Old sessions are dead, old password no longer works, new one does.
      await request(app)
        .post("/v1/auth/refresh")
        .send({ refreshToken: session.refreshToken })
        .expect(401);
      await request(app)
        .post("/v1/auth/login")
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(401);
      await request(app)
        .post("/v1/auth/login")
        .send({ email: user.email, password: "NewPassword456!" })
        .expect(200);
    });

    it("answers identically for unknown emails (no account probing)", async () => {
      const response = await request(app)
        .post("/v1/auth/forgot-password")
        .send({ email: "ghost@example.com" });

      expect(response.status).toBe(200);
      expect(enqueuePasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  it("stores users without exposing the password hash", async () => {
    await request(app).post("/v1/auth/signup").send(signupBody).expect(201);
    const stored = await prisma.user.findUnique({
      where: { email: "jane@example.com" },
    });
    expect(stored?.password).toMatch(/^\$2[aby]\$/); // bcrypt hash
  });
});
