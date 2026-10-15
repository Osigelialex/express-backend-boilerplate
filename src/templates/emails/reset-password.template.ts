import { renderOtpEmail } from "./otp.template";

export const getPasswordResetEmailTemplate = (
  name: string,
  otp: string,
  expiresInMinutes: number,
): string =>
  renderOtpEmail({
    title: "Password Reset",
    name,
    otp,
    expiresInMinutes,
    intro: "You requested to reset your password. Enter this code to continue:",
    footer:
      "If you did not request this, ignore this email - your password stays unchanged.",
  });
