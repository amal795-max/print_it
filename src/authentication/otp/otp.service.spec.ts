import type { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../users.service.js';
import { OtpService } from './otp.service.js';

describe('OtpService verification', () => {
  const dto = { email: 'user@example.com', otp: '123456' };
  const usersService = {
    findByEmailWithOtp: vi.fn(),
    consumeOtp: vi.fn(),
  };
  const service = new OtpService(
    usersService as unknown as UsersService,
    {} as MailerService,
  );
  let otpHash: string;

  const pendingUser = () => ({
    id: 'user-id',
    otp: otpHash,
    otpExpiresAt: new Date(Date.now() + 60_000),
    isVerified: false,
  });

  beforeAll(async () => {
    otpHash = await bcrypt.hash(dto.otp, 4);
  });

  beforeEach(() => {
    usersService.findByEmailWithOtp.mockReset().mockResolvedValue(pendingUser());
    usersService.consumeOtp.mockReset().mockResolvedValue(true);
  });

  it('verifies a valid OTP and consumes the hash that was checked', async () => {
    await expect(service.verify(dto)).resolves.toEqual({
      message: 'Email verified successfully',
    });
    expect(usersService.consumeOtp).toHaveBeenCalledExactlyOnceWith(
      'user-id',
      otpHash,
    );
  });

  it('rejects an expired OTP without consuming it', async () => {
    usersService.findByEmailWithOtp.mockResolvedValue({
      ...pendingUser(),
      otpExpiresAt: new Date(Date.now() - 60_000),
    });

    await expect(service.verify(dto)).rejects.toThrow('Invalid or expired OTP');
    expect(usersService.consumeOtp).not.toHaveBeenCalled();
  });

  it('rejects the previous code after an OTP is replaced', async () => {
    usersService.findByEmailWithOtp.mockResolvedValue({
      ...pendingUser(),
      otp: await bcrypt.hash('654321', 4),
    });

    await expect(service.verify(dto)).rejects.toThrow('Invalid or expired OTP');
    expect(usersService.consumeOtp).not.toHaveBeenCalled();
  });

  it('rejects a repeat verification after the OTP has been cleared', async () => {
    await service.verify(dto);
    usersService.findByEmailWithOtp.mockResolvedValue({
      ...pendingUser(),
      otp: null,
      otpExpiresAt: null,
      isVerified: true,
    });

    await expect(service.verify(dto)).rejects.toThrow('Invalid or expired OTP');
    expect(usersService.consumeOtp).toHaveBeenCalledTimes(1);
  });

  it('rejects a matching code when the conditional update affects zero rows', async () => {
    usersService.consumeOtp.mockResolvedValue(false);

    await expect(service.verify(dto)).rejects.toMatchObject({
      status: 400,
      message: 'Invalid or expired OTP',
    });
  });
});
