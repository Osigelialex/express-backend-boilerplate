import bcrypt from "bcrypt";
import type { Prisma } from "@prisma/client";
import prisma from "@/config/database";
import { BCRYPT_ROUNDS } from "@/config/constants/auth";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { PublicUserDto, UserResponseDto } from "@/dtos/auth.dto";
import { CreateAdminDto, ListUsersQueryDto } from "@/dtos/admin.dto";
import { ForbiddenError, NotFoundError } from "@/utils/appError";
import { emailTakenError } from "@/utils/authErrors";
import { normalizeEmail } from "@/utils/email";
import { isUniqueViolation } from "@/utils/prisma";
import {
  PaginatedResult,
  getPagination,
  paginate,
} from "@/utils/pagination";
import { toPublicUserDto } from "@/utils/userMapper";

/** Back-office operations. Routes are guarded by requireAuth + requireAdmin. */
export class AdminService {
  /** Creates a verified account with the admin role. */
  async createAdmin(dto: CreateAdminDto): Promise<UserResponseDto> {
    const email = normalizeEmail(dto.email);

    if (await prisma.user.findUnique({ where: { email } })) {
      throw emailTakenError();
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await prisma.user.create({
        data: {
          name: dto.name,
          email,
          password,
          role: "admin",
          emailVerified: new Date(),
        },
      });
      return { user: toPublicUserDto(user) };
    } catch (error) {
      if (isUniqueViolation(error)) throw emailTakenError();
      throw error;
    }
  }

  /**
   * Reference implementation of a paginated + filtered list:
   * validated query DTO -> where clause -> findMany + count in one
   * transaction -> PaginatedResult (the controller adds the `meta` envelope).
   */
  async listUsers(dto: ListUsersQueryDto): Promise<PaginatedResult<PublicUserDto>> {
    const pagination = getPagination(dto);

    const where: Prisma.UserWhereInput = {
      ...(dto.role && { role: dto.role }),
      ...(dto.search && {
        OR: [
          { email: { contains: dto.search, mode: "insensitive" } },
          { name: { contains: dto.search, mode: "insensitive" } },
        ],
      }),
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }], // id = stable tiebreaker
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count({ where }),
    ]);

    return paginate(users.map(toPublicUserDto), total, pagination);
  }

  async deleteUser(actingUserId: string, targetUserId: string): Promise<void> {
    if (actingUserId === targetUserId) {
      throw new ForbiddenError(ERROR_MESSAGES.CANNOT_DELETE_SELF);
    }

    const { count } = await prisma.user.deleteMany({
      where: { id: targetUserId },
    });
    if (count === 0) throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }
}
