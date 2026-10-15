import { z } from "zod";
import { nameField } from "@/dtos/auth.dto";

// Request DTOs

export const updateProfileDtoSchema = z.object({ name: nameField });
export type UpdateProfileDto = z.infer<typeof updateProfileDtoSchema>;

export const userIdParamsDtoSchema = z.object({ id: z.string().uuid() });
export type UserIdParamsDto = z.infer<typeof userIdParamsDtoSchema>;
