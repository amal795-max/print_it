import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '../common/interfaces/session.interface.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { OtpService } from './otp/otp.service.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

type PublicUser = Omit<User, 'passwordHash' | 'otp' | 'otpExpiresAt'>;

export interface AuthMessage {
  message: string;
}

export interface RegisterResult extends AuthMessage {
  email: string;
}

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Registers a user and triggers OTP email verification.
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    const user = await this.usersService.create(dto);
    await this.otpService.issueForUser(user);
    return {
      message:
        'Registration successful. An OTP has been sent to your email.',
      email: user.email,
    };
  }

  /**
   * Verifies a registration OTP.
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<AuthMessage> {
    return this.otpService.verify(dto);
  }

  /**
   * Resends a registration OTP.
   */
  async resendOtp(dto: ResendOtpDto): Promise<AuthMessage> {
    return this.otpService.resend(dto);
  }

  /**
   * Validates credentials, regenerates the session, and stores the user payload.
   */
  async login(dto: LoginDto, request: Request): Promise<SessionUser> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    const valid =
      user !== null &&
      (await this.usersService.validatePassword(user, dto.password));

    if (!valid || !user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new ForbiddenException(
        'Email is not verified. Complete OTP verification first.',
      );
    }

    await this.regenerateSession(request);

    const sessionUser = this.toSessionUser(user);
    request.session.user = sessionUser;
    this.logger.log(`User logged in: ${user.id}`);
    return sessionUser;
  }

  /**
   * Destroys the current session.
   */
  async logout(request: Request): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      request.session.destroy((error?: Error) => {
        if (error) {
          this.logger.error('Failed to destroy session', error.stack);
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Returns the current authenticated user from the database.
   */
  async me(sessionUser: SessionUser): Promise<PublicUser> {
    const user = await this.usersService.findByIdOrFail(sessionUser.id);
    return this.toPublicUser(user);
  }

  /**
   * Lists all users for admin endpoints.
   */
  async findAllUsers(): Promise<PublicUser[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => this.toPublicUser(user));
  }

  private toSessionUser(user: User): SessionUser {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
    };
  }

  private toPublicUser(user: User): PublicUser {
    const {
      passwordHash: _passwordHash,
      otp: _otp,
      otpExpiresAt: _otpExpiresAt,
      ...publicUser
    } = user;
    return publicUser;
  }

  private regenerateSession(request: Request): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      request.session.regenerate((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
