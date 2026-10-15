import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import request from "supertest";
import prisma from "@/config/database";
import app from "@/app";

export const TEST_PASSWORD = "Password123!";

interface CreateTestUserInput {
  email?: string;
  name?: string;
  password?: string;
  verified?: boolean;
  role?: "user" | "admin";
}

/** Creates a user directly in the DB. Verified, role "user" by default. */
export const createTestUser = async (data: CreateTestUserInput = {}) =>
  prisma.user.create({
    data: {
      email: data.email ?? `test-${randomUUID()}@example.com`,
      name: data.name ?? "Test User",
      password: await bcrypt.hash(data.password ?? TEST_PASSWORD, 4),
      role: data.role ?? "user",
      emailVerified: data.verified === false ? null : new Date(),
    },
  });

/** Logs a user in through the real endpoint and returns the token pair. */
export const loginAs = async (email: string, password = TEST_PASSWORD) => {
  const response = await request(app)
    .post("/v1/auth/login")
    .send({ email, password })
    .expect(200);
  return response.body.data as {
    accessToken: string;
    refreshToken: string;
    user: { id: string };
  };
};

export const bearer = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});
