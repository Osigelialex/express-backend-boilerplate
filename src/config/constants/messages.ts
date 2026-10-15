/** Every success message returned in an API response envelope. */
export const SUCCESS_MESSAGES = {
  DEFAULT: "Success",
  ACCOUNT_CREATED: "Account created. Please verify your email.",
  ACCOUNT_CREATED_VERIFIED: "Account created.",
  LOGGED_OUT: "Logged out successfully",
  TOKENS_REFRESHED: "Tokens refreshed",
  EMAIL_VERIFIED: "Email verified successfully",
  // Deliberately identical for known and unknown accounts (no user probing).
  VERIFICATION_EMAIL_SENT:
    "If the account exists, a verification email has been sent.",
  PASSWORD_RESET_EMAIL_SENT:
    "If the account exists, a password reset email has been sent.",
  PASSWORD_RESET: "Password reset successfully",
  PROFILE_FETCHED: "Profile retrieved",
  PROFILE_UPDATED: "Profile updated",
  USERS_FETCHED: "Users retrieved",
  USER_DELETED: "User deleted",
  ADMIN_CREATED: "Admin created",
  PONG: "Pong",
  ROOM_JOINED: "Joined room",
  ROOM_LEFT: "Left room",
  MESSAGE_SENT: "Message sent",
} as const;
