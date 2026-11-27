import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { AuthenticationService } from './authentication.service.js';
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

  const sampleUser = {
    id: '11111111-1111-1111-1111-111111111111',
    fullName: 'Jane Doe',
    email: 'user@example.com',
    phone: '+14155552671',
    passwordHash: 'hashed',
    role: UserRole.CUSTOMER,
    isVerified: false,
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
    service = new AuthenticationService(
      usersService as unknown as UsersService,
    );
  });

  it('registers a user without exposing passwordHash', async () => {
    usersService.create.mockResolvedValue(sampleUser);

    const dto = {
      fullName: sampleUser.fullName,
      email: sampleUser.email,
      phone: sampleUser.phone,
      password: 'Str0ng!Pass',
      role: UserRole.CUSTOMER,
    };
    const result = await service.register(dto);

    expect(usersService.create).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({
      id: sampleUser.id,
      fullName: sampleUser.fullName,
      email: sampleUser.email,
      phone: sampleUser.phone,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('logs in, regenerates the session, and stores the user', async () => {
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
    expect(request.session.user).toEqual({
      id: sampleUser.id,
      fullName: sampleUser.fullName,
      email: sampleUser.email,
      phone: sampleUser.phone,
      role: sampleUser.role,
      isVerified: sampleUser.isVerified,
    });
    expect(result.id).toBe(sampleUser.id);
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
