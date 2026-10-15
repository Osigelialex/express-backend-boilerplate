/**
 * Every client-facing error / validation message in the API. Keeping them in
 * one place makes wording consistent and easy to review or translate.
 */
export const ERROR_MESSAGES = {
  // Authentication
  NO_TOKEN_PROVIDED: "No token provided",
  INVALID_ACCESS_TOKEN: "Unauthorized - Invalid token",
  INVALID_CREDENTIALS: "Invalid credentials",
  EMAIL_NOT_VERIFIED: "Please verify your email before logging in",
  INVALID_REFRESH_TOKEN: "Invalid refresh token",
  REFRESH_TOKEN_EXPIRED: "Refresh token expired",
  INVALID_VERIFICATION_OTP: "Invalid or expired verification code",
  INVALID_RESET_OTP: "Invalid or expired reset code",

  // Authorization
  ADMIN_ONLY: "Admin access required",
  CANNOT_DELETE_SELF: "You cannot delete your own account",

  // Resources
  USER_NOT_FOUND: "User not found",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  RESOURCE_NOT_FOUND: "Resource not found",
  RESOURCE_ALREADY_EXISTS: "Resource already exists",

  // Server
  INTERNAL_SERVER_ERROR: "Internal server error",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
  TOO_MANY_REQUESTS: "Too many requests, please try again later",
  TOO_MANY_AUTH_ATTEMPTS: "Too many login attempts, please try again later",
  TOO_MANY_VERIFICATION_ATTEMPTS:
    "Too many verification attempts, please try again later",
  TOO_MANY_EVENTS: "Too many events, slow down",
  ROUTE_NOT_FOUND: "Route not found",
  MALFORMED_JSON: "Malformed JSON body",
  PAYLOAD_TOO_LARGE: "Request body too large",

  // Request validation
  VALIDATION_FAILED: "Validation failed",
  INVALID_REQUEST_DATA: "Invalid request data",
  INVALID_EMAIL: "Invalid email address",
  WEAK_PASSWORD:
    "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
  REFRESH_TOKEN_REQUIRED: "Refresh token is required",
  INVALID_OTP_FORMAT: "Code must be exactly 6 digits",
  INVALID_ROOM_NAME:
    "Room name may only contain letters, digits, ':', '_' and '-' (max 64)",
} as const;
