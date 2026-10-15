import { Router } from "express";
import {
  forgotPasswordDtoSchema,
  loginDtoSchema,
  logoutDtoSchema,
  refreshTokenDtoSchema,
  resendVerificationDtoSchema,
  resetPasswordDtoSchema,
  signupDtoSchema,
  verifyEmailDtoSchema,
} from "@/dtos/auth.dto";
import { verificationLimiter } from "@/middleware/rateLimiter";
import { validateRequest } from "@/middleware/validateRequest";
import { AuthController } from "@/controllers/auth.controller";
import { AuthService } from "@/services/auth.service";

/**
 * Public auth endpoints (mounted at /v1/auth, already behind `authLimiter`).
 * Every route follows the same recipe:
 *   [limiter] -> validateRequest(dtoSchema) -> controller method
 */
const router = Router();
const authController = new AuthController(new AuthService());

router.post("/signup", validateRequest(signupDtoSchema), authController.signup);
router.post("/login", validateRequest(loginDtoSchema), authController.login);
router.post(
  "/refresh",
  validateRequest(refreshTokenDtoSchema),
  authController.refresh,
);
router.post("/logout", validateRequest(logoutDtoSchema), authController.logout);

router.post(
  "/verify-email",
  validateRequest(verifyEmailDtoSchema),
  authController.verifyEmail,
);
router.post(
  "/send-email-verification",
  verificationLimiter,
  validateRequest(resendVerificationDtoSchema),
  authController.resendVerification,
);

router.post(
  "/forgot-password",
  verificationLimiter,
  validateRequest(forgotPasswordDtoSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  validateRequest(resetPasswordDtoSchema),
  authController.resetPassword,
);

export default router;
