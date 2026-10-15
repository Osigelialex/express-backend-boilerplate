import request from "supertest";
import app from "@/app";
import {
  bearer,
  createTestUser,
  loginAs,
} from "@/__tests__/helpers/user.helper";

describe("users", () => {
  it("requires authentication", async () => {
    const missing = await request(app).get("/v1/users/me");
    expect(missing.status).toBe(401);

    const garbage = await request(app)
      .get("/v1/users/me")
      .set(bearer("not-a-token"));
    expect(garbage.status).toBe(401);
    expect(garbage.body.code).toBe("ERR_1004");
  });

  it("returns and updates the signed-in user's profile", async () => {
    const user = await createTestUser({ name: "Old Name" });
    const { accessToken } = await loginAs(user.email);

    const updated = await request(app)
      .patch("/v1/users/me")
      .set(bearer(accessToken))
      .send({ name: "  New Name  " });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("New Name");

    const me = await request(app).get("/v1/users/me").set(bearer(accessToken));
    expect(me.body.data).toMatchObject({ id: user.id, name: "New Name" });
  });

  it("validates the profile update", async () => {
    const user = await createTestUser();
    const { accessToken } = await loginAs(user.email);

    await request(app)
      .patch("/v1/users/me")
      .set(bearer(accessToken))
      .send({ name: "x" })
      .expect(400);
  });
});

describe("operational endpoints", () => {
  it("GET /health is a liveness probe", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("GET /ready checks Postgres and Redis", async () => {
    const response = await request(app).get("/ready");
    expect(response.status).toBe(200);
    expect(response.body.checks).toEqual({ database: "ok", redis: "ok" });
  });

  it("unknown routes get the JSON 404 envelope", async () => {
    const response = await request(app).get("/v1/nope");
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, code: "ERR_4001" });
  });

  it("malformed JSON is a 400, not a 500", async () => {
    const response = await request(app)
      .post("/v1/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');
    expect(response.status).toBe(400);
  });

  it("echoes or generates a request id", async () => {
    const generated = await request(app).get("/health");
    expect(generated.headers["x-request-id"]).toBeTruthy();

    const echoed = await request(app).get("/health").set("X-Request-ID", "abc-123");
    expect(echoed.headers["x-request-id"]).toBe("abc-123");
  });
});
