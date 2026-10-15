export interface MailAddress {
  address: string;
  name?: string;
}

export interface MailMessage {
  from: MailAddress;
  to: MailAddress;
  subject: string;
  html: string;
}

/** Anything the email worker can send a rendered message through. */
export interface MailTransport {
  sendMail(message: MailMessage): Promise<unknown>;
}

/** Payload of a queued email job. Plain data only: it is stored in Redis. */
export interface EmailJobData {
  to: string;
  name: string;
  /** One-time code the worker places in the email body. */
  otp: string;
}

/** The slice of a BullMQ job the processor needs (eases unit testing). */
export interface EmailJobLike {
  name: string;
  data: EmailJobData;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}
