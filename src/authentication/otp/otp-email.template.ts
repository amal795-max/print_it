import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const templatePath = join(
  dirname(fileURLToPath(import.meta.url)),
  'templates',
  'otp-email.html',
);

/**
 * Renders the OTP verification email HTML from the external template file.
 */
export function renderOtpEmailHtml(
  otp: string,
  expiresInMinutes = 10,
): string {
  const template = readFileSync(templatePath, 'utf8');

  return template
    .replaceAll('{{otp}}', otp)
    .replaceAll('{{expiresInMinutes}}', String(expiresInMinutes));
}

/**
 * Plain-text fallback for clients that do not render HTML.
 */
export function renderOtpEmailText(
  otp: string,
  expiresInMinutes = 10,
): string {
  return `Your verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`;
}
