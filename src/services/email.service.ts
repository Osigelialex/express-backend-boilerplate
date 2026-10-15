import { ENV } from "@/config/env";
import { OTP_TTL_SECONDS } from "@/config/constants/auth";
import { EMAIL_SUBJECTS } from "@/config/constants/email";
import type { MailMessage, MailTransport } from "@/interfaces/email.interface";
import {
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
} from "@/templates/emails";
import { escapeHtml } from "@/utils/html";

/**
 * Renders and sends transactional emails. Only the email worker should use
 * this; the API process enqueues jobs instead (see queues/email.queue.ts) so
 * a slow mail provider can never slow down or fail a request.
 */
export class EmailService {
  private readonly from: MailMessage["from"] = {
    address: ENV.EMAIL_FROM,
    name: ENV.APP_NAME,
  };
  private readonly otpTtlMinutes = Math.round(OTP_TTL_SECONDS / 60);

  constructor(private readonly transport: MailTransport) {}

  async sendVerificationEmail(to: string, name: string, otp: string) {
    return this.transport.sendMail({
      from: this.from,
      to: { address: to, name },
      subject: EMAIL_SUBJECTS.verification,
      html: getVerificationEmailTemplate(
        escapeHtml(name),
        escapeHtml(otp),
        this.otpTtlMinutes,
      ),
    });
  }

  async sendPasswordResetEmail(to: string, name: string, otp: string) {
    return this.transport.sendMail({
      from: this.from,
      to: { address: to, name },
      subject: EMAIL_SUBJECTS.passwordReset,
      html: getPasswordResetEmailTemplate(
        escapeHtml(name),
        escapeHtml(otp),
        this.otpTtlMinutes,
      ),
    });
  }
}
