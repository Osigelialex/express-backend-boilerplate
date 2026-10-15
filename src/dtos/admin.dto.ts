import { z } from "zod";
import { SEARCH_MAX_LENGTH } from "@/config/constants/validation";
import { emailField, nameField, passwordField } from "@/dtos/auth.dto";
import { paginationQueryDtoSchema } from "@/dtos/pagination.dto";

// Request DTOs

export const createAdminDtoSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});
export type CreateAdminDto = z.infer<typeof createAdminDtoSchema>;

export const listUsersQueryDtoSchema = paginationQueryDtoSchema.extend({
  /** Case-insensitive match on name or email. */
  search: z.string().trim().min(1).max(SEARCH_MAX_LENGTH).optional(),
  role: z.enum(["user", "admin"]).optional(),
});
export type ListUsersQueryDto = z.infer<typeof listUsersQueryDtoSchema>;
