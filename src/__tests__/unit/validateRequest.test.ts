import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validateRequest } from "@/middleware/validateRequest";
import { ValidationError } from "@/utils/appError";

const schema = z.object({
  name: z.string().trim().min(2),
  page: z.coerce.number().int().default(1),
});

const run = (req: Partial<Request>, source?: "body" | "query" | "params") => {
  const next = jest.fn() as unknown as NextFunction & jest.Mock;
  validateRequest(schema, source)(req as Request, {} as Response, next);
  return next;
};

describe("validateRequest", () => {
  it("replaces the body with the parsed DTO and calls next()", () => {
    const req = { body: { name: "  Jane  ", extra: "dropped" } };
    const next = run(req);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Jane", page: 1 });
  });

  it("can validate the query string with coercion", () => {
    const req = { query: { name: "Jane", page: "3" } } as unknown as Request;
    run(req, "query");
    expect(req.query).toEqual({ name: "Jane", page: 3 });
  });

  it("forwards a ValidationError with field details", () => {
    const next = run({ body: { name: "J" } });

    const error = next.mock.calls[0][0] as ValidationError;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual([
      { field: "name", message: expect.any(String) },
    ]);
  });
});
