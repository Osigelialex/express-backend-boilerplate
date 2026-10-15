import { Prisma } from "@prisma/client";
import { normalizeError } from "@/middleware/errorHandler";
import { AppError, NotFoundError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

describe("normalizeError", () => {
  it("passes AppErrors through untouched", () => {
    const error = new NotFoundError("nope");
    expect(normalizeError(error)).toBe(error);
  });

  it("maps Prisma unique violations to 409 and missing rows to 404", () => {
    const unique = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    });
    const missing = new Prisma.PrismaClientKnownRequestError("gone", {
      code: "P2025",
      clientVersion: "test",
    });

    expect(normalizeError(unique)).toMatchObject({ statusCode: 409 });
    expect(normalizeError(missing)).toMatchObject({ statusCode: 404 });
  });

  it("maps malformed JSON and oversized bodies from body-parser", () => {
    expect(normalizeError({ type: "entity.parse.failed" })).toMatchObject({
      statusCode: 400,
      code: ErrorCode.VALIDATION_ERROR,
    });
    expect(normalizeError({ type: "entity.too.large" })).toMatchObject({
      statusCode: 413,
    });
  });

  it("hides the details of unexpected errors", () => {
    const normalized = normalizeError(new Error("db password is hunter2"));

    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.statusCode).toBe(500);
    expect(normalized.isOperational).toBe(false);
    expect(normalized.message).toBe("Internal server error");
  });
});
