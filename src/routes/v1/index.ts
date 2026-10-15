import { Router } from "express";
import adminRoutes from "@/routes/admin.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";

/**
 * Registry of every v1 route group. To add a feature:
 *   1. create routes/<feature>.routes.ts (+ controller, service, dto);
 *   2. mount it here: `v1Router.use("/<feature>", featureRoutes);`
 */
const v1Router = Router();

v1Router.use("/auth", authRoutes);
v1Router.use("/users", userRoutes);
v1Router.use("/admin", adminRoutes);

export default v1Router;
