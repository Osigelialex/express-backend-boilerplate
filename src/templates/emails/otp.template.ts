export interface OtpEmailContent {
  /** <title> and heading context, already HTML-escaped by the caller. */
  title: string;
  name: string;
  intro: string;
  otp: string;
  expiresInMinutes: number;
  footer: string;
}

/**
 * Shared layout for "here is your code" emails. All interpolated values must
 * already be escaped (EmailService does it with utils/html.escapeHtml).
 * Inline <style> is used on purpose: most mail clients strip external CSS.
 */
export const renderOtpEmail = ({
  title,
  name,
  intro,
  otp,
  expiresInMinutes,
  footer,
}: OtpEmailContent): string => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333;
           max-width: 600px; margin: 0 auto; padding: 20px; }
    .code { display: inline-block; padding: 12px 24px; background: #f4f6f8;
            border-radius: 5px; margin: 20px 0; font-size: 28px;
            font-weight: bold; letter-spacing: 6px; }
    .footer { margin-top: 30px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>Hello ${name},</h1>
  <p>${intro}</p>
  <p class="code">${otp}</p>
  <p>This code will expire in ${expiresInMinutes} minutes.</p>
  <div class="footer">
    <p>${footer}</p>
  </div>
</body>
</html>`;
