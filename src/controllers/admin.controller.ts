import { Request, Response, NextFunction } from "express";
import { SUCCESS_MESSAGES } from "@/config/constants/messages";
import { CreateAdminDto, ListUsersQueryDto } from "@/dtos/admin.dto";
import { UserIdParamsDto } from "@/dtos/user.dto";
import { AdminService } from "@/services/admin.service";
import { BaseController } from "@/controllers/base.controller";

export class AdminController extends BaseController {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  createAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const dto: CreateAdminDto = req.body;
    void this.handleRequest(
      req,
      res,
      next,
      () => this.adminService.createAdmin(dto),
      { status: 201, message: SUCCESS_MESSAGES.ADMIN_CREATED },
    );
  };

  /** Paginated: the service returns a PaginatedResult, so `meta` is added. */
  listUsers = (req: Request, res: Response, next: NextFunction): void => {
    // validateRequest(..., "query") replaced req.query with the parsed DTO.
    const dto = req.query as unknown as ListUsersQueryDto;
    void this.handleRequest(
      req,
      res,
      next,
      () => this.adminService.listUsers(dto),
      { message: SUCCESS_MESSAGES.USERS_FETCHED },
    );
  };

  deleteUser = (req: Request, res: Response, next: NextFunction): void => {
    const { id } = req.params as unknown as UserIdParamsDto;
    void this.handleRequest(
      req,
      res,
      next,
      async () => {
        await this.adminService.deleteUser(req.user.userId, id);
        return null;
      },
      { message: SUCCESS_MESSAGES.USER_DELETED },
    );
  };
}
