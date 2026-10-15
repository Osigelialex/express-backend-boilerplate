import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 * Gives every request an id (honouring an upstream `X-Request-ID`), echoes it
 * in the response header and exposes it as `req.requestId` so logs and error
 * responses can be correlated.
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers["x-request-id"];
  req.requestId =
    typeof incoming === "string" && incoming.length > 0 && incoming.length <= 100
      ? incoming
      : randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
};
