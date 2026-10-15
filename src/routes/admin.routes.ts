import { Router } from "express";
import {
  createAdminDtoSchema,
  listUsersQueryDtoSchema,
} from "@/dtos/admin.dto";
import { userIdParamsDtoSchema } from "@/dtos/user.dto";
import { requireAuth } from "@/middleware/authMiddleware";
import { requireAdmin } from "@/middleware/requireRole";
import { validateRequest } from "@/middleware/validateRequest";
import { AdminController } from "@/controllers/admin.controller";
import { AdminService } from "@/services/admin.service";

/** Back-office endpoints (mounted at /v1/admin). Admins only. */
const router = Router();
const adminController = new AdminController(new AdminService());

router.use(requireAuth, requireAdmin);

router.post(
  "/admins",
  validateRequest(createAdminDtoSchema),
  adminController.createAdmin,
);

// GET /v1/admin/users?page=1&limit=20&search=jane&role=user
router.get(
  "/users",
  validateRequest(listUsersQueryDtoSchema, "query"),
  adminController.listUsers,
);

router.delete(
  "/users/:id",
  validateRequest(userIdParamsDtoSchema, "params"),
  adminController.deleteUser,
);

export default router;
