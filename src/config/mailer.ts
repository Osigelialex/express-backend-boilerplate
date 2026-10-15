import { ENV } from "@/config/env";
import type { MailTransport } from "@/interfaces/email.interface";
import {
  createLogMailTransport,
  createSmtpMailTransport,
} from "@/utils/mailTransports";

/**
 * The transport used by the email worker: real SMTP when SMTP_HOST is set.
 * Without one (development/test only; env.ts requires it in production)
 * emails are logged instead of delivered.
 *
 * To switch provider (SES, Resend, SendGrid API...) implement `MailTransport`
 * and return it here - nothing else changes.
 */
export const createMailTransport = (): MailTransport =>
  ENV.SMTP_HOST
    ? createSmtpMailTransport({
        host: ENV.SMTP_HOST,
        port: ENV.SMTP_PORT,
        secure: ENV.SMTP_SECURE,
        user: ENV.SMTP_USER,
        password: ENV.SMTP_PASSWORD,
      })
    : createLogMailTransport();
