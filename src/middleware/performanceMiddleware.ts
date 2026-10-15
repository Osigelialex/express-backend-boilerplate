import compression from "compression";
import { Request, Response } from "express";

// Clients can opt out with `x-no-compression` (handy when debugging).
const shouldCompress = (req: Request, res: Response) => {
  if (req.headers["x-no-compression"]) return false;
  return compression.filter(req, res);
};

export const compressionMiddleware = compression({
  filter: shouldCompress,
  level: 6,
  threshold: 1024, // skip responses under 1KB, not worth the CPU
});
