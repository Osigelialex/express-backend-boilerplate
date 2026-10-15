import nodemailer from "nodemailer";
import { logger } from "@/config/logger";
import type {
  MailMessage,
  MailTransport,
  SmtpConfig,
} from "@/interfaces/email.interface";

/**
 * Delivers over SMTP (any provider: SES, Mailgun, Postmark, Gmail, Mailpit...).
 * Throws on failure so the BullMQ job is retried with backoff.
 */
export const createSmtpMailTransport = (config: SmtpConfig): MailTransport => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && config.password
      ? { auth: { user: config.user, pass: config.password } }
      : {}),
  });

  return {
    sendMail: (message: MailMessage) =>
      transporter.sendMail({
        from: { name: message.from.name ?? "", address: message.from.address },
        to: { name: message.to.name ?? "", address: message.to.address },
        subject: message.subject,
        html: message.html,
      }),
  };
};

/**
 * Stand-in used while no SMTP host is configured (development/test only):
 * records that an email would have been sent instead of delivering it.
 */
export const createLogMailTransport = (): MailTransport => ({
  async sendMail(message: MailMessage): Promise<void> {
    logger.info("Email not sent: SMTP_HOST is not set", {
      to: message.to.address,
      subject: message.subject,
    });
  },
});
