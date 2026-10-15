import type { User } from "@prisma/client";
import { PublicUserDto, publicUserDtoSchema } from "@/dtos/auth.dto";

/**
 * Maps a database row to the public response DTO. Always go through a mapper
 * (never return a Prisma row directly) so fields like `password` can't leak
 * and the API contract stays independent of the table layout.
 */
export const toPublicUserDto = (user: User): PublicUserDto =>
  publicUserDtoSchema.parse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified !== null,
    createdAt: user.createdAt,
  });
