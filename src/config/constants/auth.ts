import bcrypt from "bcrypt";
import { ENV } from "@/config/env";
import type { OtpPurpose } from "@/interfaces/otp.interface";
import type { TokenType } from "@/interfaces/token.interface";

// Cheap rounds in tests keep the suite fast; 12 is a sound production default.
export const BCRYPT_ROUNDS = ENV.NODE_ENV === "test" ? 4 : 12;

// Compared against when the email is unknown so response time doesn't reveal
// whether an account exists (see AuthService.login).
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export const PRISMA_UNIQUE_VIOLATION_CODE = "P2002";

export const TOKEN_TYPE: Record<"access" | "refresh", TokenType> = {
  access: "access",
  refresh: "refresh",
};

export const OTP_PURPOSE: Record<"emailVerify" | "passwordReset", OtpPurpose> =
  {
    emailVerify: "email_verify",
    passwordReset: "password_reset",
  };

/** One-time codes emailed for verification / password reset. */
export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;

export const DURATION_PATTERN = /^(\d+)([smhd])$/;
export const DURATION_UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};
