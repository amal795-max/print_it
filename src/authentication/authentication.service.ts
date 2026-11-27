import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '../common/interfaces/session.interface.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Registers a new user without creating a session.
   */
  async register(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.create(dto);
    return this.toPublicUser(user);
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
  async me(sessionUser: SessionUser): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findByIdOrFail(sessionUser.id);
    return this.toPublicUser(user);
  }

  /**
   * Lists all users for admin endpoints.
   */
  async findAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
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

  private toPublicUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...publicUser } = user;
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
