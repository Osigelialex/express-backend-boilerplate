import request from "supertest";
import app from "@/app";
import prisma from "@/config/database";
import {
  bearer,
  createTestUser,
  loginAs,
} from "@/__tests__/helpers/user.helper";

describe("admin", () => {
  const adminToken = async () => {
    const admin = await createTestUser({ role: "admin", name: "Boss" });
    return { admin, ...(await loginAs(admin.email)) };
  };

  describe("authorization", () => {
    it("rejects anonymous callers (401) and non-admins (403)", async () => {
      await request(app).get("/v1/admin/users").expect(401);

      const user = await createTestUser();
      const { accessToken } = await loginAs(user.email);
      const response = await request(app)
        .get("/v1/admin/users")
        .set(bearer(accessToken));
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("ERR_2002");
    });

    it("applies a demotion immediately (role is read from the DB)", async () => {
      const { admin, accessToken } = await adminToken();
      await request(app).get("/v1/admin/users").set(bearer(accessToken)).expect(200);

      await prisma.user.update({ where: { id: admin.id }, data: { role: "user" } });

      await request(app).get("/v1/admin/users").set(bearer(accessToken)).expect(403);
    });
  });

  describe("GET /v1/admin/users (pagination)", () => {
    beforeEach(async () => {
      for (let i = 1; i <= 25; i += 1) {
        await createTestUser({
          email: `member${String(i).padStart(2, "0")}@example.com`,
          name: i % 5 === 0 ? `Special ${i}` : `Member ${i}`,
        });
      }
    });

    it("returns the first page with meta", async () => {
      const { accessToken } = await adminToken(); // 26 users in total

      const response = await request(app)
        .get("/v1/admin/users?page=1&limit=10")
        .set(bearer(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 26,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it("returns the partial last page and does not repeat rows", async () => {
      const { accessToken } = await adminToken();

      const ids = new Set<string>();
      for (const page of [1, 2, 3]) {
        const response = await request(app)
          .get(`/v1/admin/users?page=${page}&limit=10`)
          .set(bearer(accessToken));
        response.body.data.forEach((u: { id: string }) => ids.add(u.id));
        if (page === 3) {
          expect(response.body.data).toHaveLength(6);
          expect(response.body.meta.hasNextPage).toBe(false);
        }
      }
      expect(ids.size).toBe(26);
    });

    it("filters by search and role", async () => {
      const { accessToken } = await adminToken();

      const search = await request(app)
        .get("/v1/admin/users?search=special")
        .set(bearer(accessToken));
      expect(search.body.meta.total).toBe(5);

      const admins = await request(app)
        .get("/v1/admin/users?role=admin")
        .set(bearer(accessToken));
      expect(admins.body.meta.total).toBe(1);
    });

    it("rejects out-of-range pagination input", async () => {
      const { accessToken } = await adminToken();

      await request(app)
        .get("/v1/admin/users?limit=1000")
        .set(bearer(accessToken))
        .expect(400);
      await request(app)
        .get("/v1/admin/users?page=0")
        .set(bearer(accessToken))
        .expect(400);
    });
  });

  describe("management", () => {
    it("creates another admin who can log in", async () => {
      const { accessToken } = await adminToken();

      const created = await request(app)
        .post("/v1/admin/admins")
        .set(bearer(accessToken))
        .send({
          name: "Second Admin",
          email: "second@example.com",
          password: "Password123!",
        });
      expect(created.status).toBe(201);
      expect(created.body.data.user.role).toBe("admin");

      const login = await loginAs("second@example.com");
      await request(app)
        .get("/v1/admin/users")
        .set(bearer(login.accessToken))
        .expect(200);
    });

    it("deletes a user but never yourself", async () => {
      const { admin, accessToken } = await adminToken();
      const victim = await createTestUser();

      await request(app)
        .delete(`/v1/admin/users/${victim.id}`)
        .set(bearer(accessToken))
        .expect(200);
      await request(app)
        .delete(`/v1/admin/users/${victim.id}`)
        .set(bearer(accessToken))
        .expect(404);
      await request(app)
        .delete(`/v1/admin/users/${admin.id}`)
        .set(bearer(accessToken))
        .expect(403);
      await request(app)
        .delete("/v1/admin/users/not-a-uuid")
        .set(bearer(accessToken))
        .expect(400);
    });
  });
});
