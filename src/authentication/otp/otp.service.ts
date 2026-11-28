import { randomInt } from 'node:crypto';
import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ResendOtpDto } from '../dto/resend-otp.dto.js';
import { VerifyOtpDto } from '../dto/verify-otp.dto.js';
import {
  renderOtpEmailHtml,
  renderOtpEmailText,
} from './otp-email.template.js';
import { User } from '../user.entity.js';
import { UsersService } from '../users.service.js';

export interface OtpMessage {
  message: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpTtlMs = 10 * 60 * 1000;
  private readonly otpSaltRounds = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Generates, stores, and emails a fresh OTP for the given user.
   */
  async issueForUser(user: User): Promise<void> {
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, this.otpSaltRounds);
    const otpExpiresAt = new Date(Date.now() + this.otpTtlMs);

    await this.usersService.saveOtp(user.id, otpHash, otpExpiresAt);

    const expiresInMinutes = this.otpTtlMs / 60_000;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Your verification code',
        text: renderOtpEmailText(otp, expiresInMinutes),
        html: renderOtpEmailHtml(otp, expiresInMinutes),
      });
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send OTP to ${user.email}`, stack);
      throw new ServiceUnavailableException(
        'The verification email could not be sent. Request a new OTP.',
      );
    }
  }

  /**
   * Verifies a 6-digit OTP and marks the account as verified.
   */
  async verify(dto: VerifyOtpDto): Promise<OtpMessage> {
    const user = await this.usersService.findByEmailWithOtp(dto.email);

    if (!user?.otp || !user.otpExpiresAt) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const matches = await bcrypt.compare(dto.otp, user.otp);
    if (!matches) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const consumed = await this.usersService.consumeOtp(user.id, user.otp);
    if (!consumed) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    this.logger.log(`Email verified for user: ${user.id}`);
    return { message: 'Email verified successfully' };
  }

  /**
   * Issues a fresh OTP for an unverified account.
   */
  async resend(dto: ResendOtpDto): Promise<OtpMessage> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.issueForUser(user);
    return { message: 'A new OTP has been sent to your email' };
  }

  private generateOtp(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
