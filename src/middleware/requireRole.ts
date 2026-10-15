import { Request, Response, NextFunction } from "express";
import prisma from "@/config/database";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import type { UserRole } from "@/interfaces/role.interface";
import { ForbiddenError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

/**
 * Role-based access control. Must run after `requireAuth`.
 *
 *   router.use(requireAuth, requireRole("admin"));
 *
 * The role is re-read from the database instead of trusted from the access
 * token, so a demotion/deletion takes effect immediately rather than when the
 * token expires. (One indexed lookup per protected request.)
 */
export const requireRole =
  (...roles: UserRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true },
      });

      if (!user || !roles.includes(user.role)) {
        throw new ForbiddenError(
          ERROR_MESSAGES.ADMIN_ONLY,
          ErrorCode.INSUFFICIENT_PERMISSIONS,
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };

/** Shorthand for the most common guard. */
export const requireAdmin = requireRole("admin");
