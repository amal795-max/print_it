import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationController } from './authentication.controller.js';
import type { AuthenticationService } from './authentication.service.js';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authenticationService: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    me: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authenticationService = {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
    };
    controller = new AuthenticationController(
      authenticationService as unknown as AuthenticationService,
    );
  });

  it('delegates register to the auth service', async () => {
    const dto = {
      fullName: 'Jane Doe',
      email: 'user@example.com',
      phone: '+14155552671',
      password: 'Str0ng!Pass',
    };
    authenticationService.register.mockResolvedValue({
      message: 'Registration successful. An OTP has been sent to your email.',
      email: dto.email,
    });

    await expect(controller.register(dto)).resolves.toEqual({
      message: 'Registration successful. An OTP has been sent to your email.',
      email: dto.email,
    });
    expect(authenticationService.register).toHaveBeenCalledWith(dto);
  });
});
