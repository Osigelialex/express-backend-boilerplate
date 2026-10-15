import { Request, Response, NextFunction } from "express";
import { ENV } from "@/config/env";
import { SUCCESS_MESSAGES } from "@/config/constants/messages";
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SignupDto,
  VerifyEmailDto,
} from "@/dtos/auth.dto";
import { AuthService } from "@/services/auth.service";
import { BaseController } from "@/controllers/base.controller";

/**
 * Handlers are arrow-function properties so `this` stays bound when they are
 * passed straight to the router: `router.post("/login", controller.login)`.
 * `req.body` is already a validated DTO (see middleware/validateRequest.ts).
 */
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  signup = (req: Request, res: Response, next: NextFunction): void => {
    const dto: SignupDto = req.body;
    void this.handleRequest(req, res, next, () => this.authService.signup(dto), {
      status: 201,
      message: ENV.REQUIRE_EMAIL_VERIFICATION
        ? SUCCESS_MESSAGES.ACCOUNT_CREATED
        : SUCCESS_MESSAGES.ACCOUNT_CREATED_VERIFIED,
    });
  };

  login = (req: Request, res: Response, next: NextFunction): void => {
    const dto: LoginDto = req.body;
    void this.handleRequest(req, res, next, () => this.authService.login(dto));
  };

  refresh = (req: Request, res: Response, next: NextFunction): void => {
    const dto: RefreshTokenDto = req.body;
    void this.handleRequest(req, res, next, () => this.authService.refresh(dto), {
      message: SUCCESS_MESSAGES.TOKENS_REFRESHED,
    });
  };

  logout = (req: Request, res: Response, next: NextFunction): void => {
    const dto: LogoutDto = req.body;
    void this.handleRequest(
      req,
      res,
      next,
      async () => {
        await this.authService.logout(dto);
        return null;
      },
      { message: SUCCESS_MESSAGES.LOGGED_OUT },
    );
  };

  verifyEmail = (req: Request, res: Response, next: NextFunction): void => {
    const dto: VerifyEmailDto = req.body;
    void this.handleRequest(
      req,
      res,
      next,
      () => this.authService.verifyEmail(dto),
      { message: SUCCESS_MESSAGES.EMAIL_VERIFIED },
    );
  };

  resendVerification = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const dto: ResendVerificationDto = req.body;
    void this.handleRequest(
      req,
      res,
      next,
      async () => {
        await this.authService.resendVerificationEmail(dto);
        return null;
      },
      { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT },
    );
  };

  forgotPassword = (req: Request, res: Response, next: NextFunction): void => {
    const dto: ForgotPasswordDto = req.body;
    void this.handleRequest(
      req,
      res,
      next,
      async () => {
        await this.authService.forgotPassword(dto);
        return null;
      },
      { message: SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT },
    );
  };

  resetPassword = (req: Request, res: Response, next: NextFunction): void => {
    const dto: ResetPasswordDto = req.body;
    void this.handleRequest(
      req,
      res,
      next,
      async () => {
        await this.authService.resetPassword(dto);
        return null;
      },
      { message: SUCCESS_MESSAGES.PASSWORD_RESET },
    );
  };
}
