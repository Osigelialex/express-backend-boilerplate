import { Request, Response, NextFunction } from "express";
import { SUCCESS_MESSAGES } from "@/config/constants/messages";
import { UpdateProfileDto } from "@/dtos/user.dto";
import { UserService } from "@/services/user.service";
import { BaseController } from "@/controllers/base.controller";

export class UserController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  /** `req.user` is set by `requireAuth`. */
  getMe = (req: Request, res: Response, next: NextFunction): void => {
    void this.handleRequest(
      req,
      res,
      next,
      () => this.userService.getById(req.user.userId),
      { message: SUCCESS_MESSAGES.PROFILE_FETCHED },
    );
  };

  updateMe = (req: Request, res: Response, next: NextFunction): void => {
    const dto: UpdateProfileDto = req.body;
    void this.handleRequest(
      req,
      res,
      next,
      () => this.userService.updateProfile(req.user.userId, dto),
      { message: SUCCESS_MESSAGES.PROFILE_UPDATED },
    );
  };
}
