/** Emails are stored and compared lower-cased and trimmed. */
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();
