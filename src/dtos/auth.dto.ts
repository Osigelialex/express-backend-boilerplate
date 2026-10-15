import { z } from "zod";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  OTP_PATTERN,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  TOKEN_MAX_LENGTH,
} from "@/config/constants/validation";

/**
 * DTOs ("data transfer objects") are the zod schemas that define every
 * request body/params/query and response payload. Each has the schema
 * (`xxxDtoSchema`) and an inferred type (`XxxDto`). `validateRequest`
 * parses incoming requests with them, then controllers/services receive the
 * typed, trimmed, unknown-keys-stripped result.
 */

// ---------------------------------------------------------------------------
// Field schemas (reused across DTOs)
// ---------------------------------------------------------------------------

export const nameField = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH)
  .max(NAME_MAX_LENGTH);

export const emailField = z
  .string()
  .trim()
  .email(ERROR_MESSAGES.INVALID_EMAIL)
  .max(EMAIL_MAX_LENGTH);

export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .regex(PASSWORD_PATTERN, ERROR_MESSAGES.WEAK_PASSWORD);

const otpField = z.string().regex(OTP_PATTERN, ERROR_MESSAGES.INVALID_OTP_FORMAT);

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export const signupDtoSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});
export type SignupDto = z.infer<typeof signupDtoSchema>;

export const loginDtoSchema = z.object({
  email: emailField,
  // Don't apply the strength rules on login: old passwords must still work.
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginDto = z.infer<typeof loginDtoSchema>;

export const refreshTokenDtoSchema = z.object({
  refreshToken: z
    .string()
    .min(1, ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED)
    .max(TOKEN_MAX_LENGTH),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenDtoSchema>;

export const logoutDtoSchema = refreshTokenDtoSchema;
export type LogoutDto = RefreshTokenDto;

export const verifyEmailDtoSchema = z.object({
  email: emailField,
  otp: otpField,
});
export type VerifyEmailDto = z.infer<typeof verifyEmailDtoSchema>;

export const resendVerificationDtoSchema = z.object({ email: emailField });
export type ResendVerificationDto = z.infer<typeof resendVerificationDtoSchema>;

export const forgotPasswordDtoSchema = z.object({ email: emailField });
export type ForgotPasswordDto = z.infer<typeof forgotPasswordDtoSchema>;

export const resetPasswordDtoSchema = z.object({
  email: emailField,
  otp: otpField,
  password: passwordField,
});
export type ResetPasswordDto = z.infer<typeof resetPasswordDtoSchema>;

// ---------------------------------------------------------------------------
// Response DTOs (the `data` payloads)
// ---------------------------------------------------------------------------

export const publicUserDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["user", "admin"]),
  emailVerified: z.boolean(),
  createdAt: z.date(),
});
export type PublicUserDto = z.infer<typeof publicUserDtoSchema>;

export const tokenPairDtoSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type TokenPairDto = z.infer<typeof tokenPairDtoSchema>;

export const userResponseDtoSchema = z.object({ user: publicUserDtoSchema });
export type UserResponseDto = z.infer<typeof userResponseDtoSchema>;

export const authResponseDtoSchema =
  userResponseDtoSchema.merge(tokenPairDtoSchema);
export type AuthResponseDto = z.infer<typeof authResponseDtoSchema>;
