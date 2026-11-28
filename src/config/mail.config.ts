import { ConfigService } from '@nestjs/config';
import type { MailerOptions } from '@nestjs-modules/mailer';

/**
 * Builds MailerModule options from environment variables.
 */
export function mailConfig(config: ConfigService): MailerOptions {
  const port = Number(config.get<string>('SMTP_PORT', '587'));
  const user = config.get<string>('SMTP_USER');
  const pass = config.get<string>('SMTP_PASS');
  const from =
    config.get<string>('MAIL_FROM') ?? '"Print It" <noreply@printit.local>';

     return {
    transport: {
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    },
    defaults: {
      from,
    },
  };
}
