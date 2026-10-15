import prisma from "@/config/database";
import { redis } from "@/config/redis";

// The API process must only ENQUEUE emails, never send them. Tests read the
// OTP from the mock's calls: `(enqueueVerificationEmail as jest.Mock).mock`.
jest.mock("@/queues/email.queue", () => ({
  enqueueVerificationEmail: jest.fn().mockResolvedValue(undefined),
  enqueuePasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  closeEmailQueue: jest.fn().mockResolvedValue(undefined),
}));

const reset = async () => {
  await prisma.user.deleteMany();
  await redis.flushdb();
};

beforeAll(async () => {
  await prisma.$connect();
  await reset();
});

beforeEach(async () => {
  jest.clearAllMocks();
  await reset();
});

afterAll(async () => {
  await reset();
  await prisma.$disconnect();
  await redis.quit();
});
