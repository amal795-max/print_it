import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { AuthenticationService } from './authentication.service.js';
import type { OtpService } from './otp/otp.service.js';
import { UserRole } from './roles/user-role.enum.js';
import type { UsersService } from './users.service.js';
import type { User } from './user.entity.js';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let usersService: {
    create: ReturnType<typeof vi.fn>;
    findByEmailWithPassword: ReturnType<typeof vi.fn>;
    validatePassword: ReturnType<typeof vi.fn>;
    findByIdOrFail: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };
  let otpService: {
    issueForUser: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
    resend: ReturnType<typeof vi.fn>;
  };

  const sampleUser = {
    id: '11111111-1111-1111-1111-111111111111',
    fullName: 'Jane Doe',
    email: 'user@example.com',
    phone: '+14155552671',
    passwordHash: 'hashed',
    role: UserRole.CUSTOMER,
    isVerified: true,
    otp: null,
    otpExpiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  } as User;

  beforeEach(() => {
    usersService = {
      create: vi.fn(),
      findByEmailWithPassword: vi.fn(),
      validatePassword: vi.fn(),
      findByIdOrFail: vi.fn(),
      findAll: vi.fn(),
    };
    otpService = {
      issueForUser: vi.fn(),
      verify: vi.fn(),
      resend: vi.fn(),
    };
    service = new AuthenticationService(
      usersService as unknown as UsersService,
      otpService as unknown as OtpService,
    );
  });

  it('registers a user and delegates OTP issuance', async () => {
    usersService.create.mockResolvedValue({ ...sampleUser, isVerified: false });

    const dto = {
      fullName: sampleUser.fullName,
      email: sampleUser.email,
      phone: sampleUser.phone,
      password: 'Str0ng!Pass',
    };
    const result = await service.register(dto);

    expect(usersService.create).toHaveBeenCalledWith(dto);
    expect(otpService.issueForUser).toHaveBeenCalledOnce();
    expect(result).toEqual({
      message:
        'Registration successful. An OTP has been sent to your email.',
      email: sampleUser.email,
    });
  });

  it('logs in a verified user and stores the session', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(sampleUser);
    usersService.validatePassword.mockResolvedValue(true);

    const request = {
      session: {
        regenerate: vi.fn((callback: (error?: Error) => void) => callback()),
        user: undefined as unknown,
      },
    } as unknown as Request;

    const result = await service.login(
      { email: sampleUser.email, password: 'Str0ng!Pass' },
      request,
    );

    expect(request.session.regenerate).toHaveBeenCalled();
    expect(request.session.user?.isVerified).toBe(true);
    expect(result.id).toBe(sampleUser.id);
  });

  it('rejects login when the email is not verified', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      ...sampleUser,
      isVerified: false,
    });
    usersService.validatePassword.mockResolvedValue(true);

    const request = {
      session: { regenerate: vi.fn() },
    } as unknown as Request;

    await expect(
      service.login(
        { email: sampleUser.email, password: 'Str0ng!Pass' },
        request,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(request.session.regenerate).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials with a generic message', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    const request = {
      session: {
        regenerate: vi.fn(),
      },
    } as unknown as Request;

    await expect(
      service.login(
        { email: 'missing@example.com', password: 'wrong' },
        request,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(request.session.regenerate).not.toHaveBeenCalled();
  });

  it('destroys the session on logout', async () => {
    const request = {
      session: {
        destroy: vi.fn((callback: (error?: Error) => void) => callback()),
      },
    } as unknown as Request;

    await service.logout(request);
    expect(request.session.destroy).toHaveBeenCalled();
  });
});
