import { Router } from "express";
import { updateProfileDtoSchema } from "@/dtos/user.dto";
import { requireAuth } from "@/middleware/authMiddleware";
import { validateRequest } from "@/middleware/validateRequest";
import { UserController } from "@/controllers/user.controller";
import { UserService } from "@/services/user.service";

/** The signed-in user's own resources (mounted at /v1/users). */
const router = Router();
const userController = new UserController(new UserService());

// Everything below requires a valid access token.
router.use(requireAuth);

router.get("/me", userController.getMe);
router.patch(
  "/me",
  validateRequest(updateProfileDtoSchema),
  userController.updateMe,
);

export default router;
