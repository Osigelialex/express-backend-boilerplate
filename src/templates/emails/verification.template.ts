import { renderOtpEmail } from "./otp.template";

export const getVerificationEmailTemplate = (
  name: string,
  otp: string,
  expiresInMinutes: number,
): string =>
  renderOtpEmail({
    title: "Email Verification",
    name,
    otp,
    expiresInMinutes,
    intro:
      "Thank you for signing up! Enter this code to verify your email address:",
    footer: "If you did not create an account, you can ignore this email.",
  });
