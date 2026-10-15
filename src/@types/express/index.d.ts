// Teaches TypeScript about the properties our middleware adds to `req`.
// The values are set by:
//   - `requestId`  (middleware/requestId.ts)
//   - `requireAuth` (middleware/authMiddleware.ts) -> only on protected routes
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user: {
        userId: string;
        role: "user" | "admin";
      };
    }
  }
}

export {};
