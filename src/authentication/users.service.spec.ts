import * as bcrypt from 'bcrypt';
import { FindOperator, type FindOptionsWhere, type Repository } from 'typeorm';
import { expect, it, vi } from 'vitest';
import { UserRole } from './roles/user-role.enum.js';
import type { User } from './user.entity.js';
import { UsersService } from './users.service.js';

const registration = {
  fullName: 'Jane Doe',
  email: 'user@example.com',
  phone: '+14155552671',
  password: 'Str0ng!Pass',
};

it.each([
  { description: 'standard registration', dto: registration },
  {
    description: 'registration with an extra admin role',
    dto: { ...registration, role: UserRole.ADMIN },
  },
])('persists a customer for $description', async ({ dto }) => {
  const repository = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn((user: Partial<User>) => user),
    save: vi.fn(async (user: Partial<User>) => ({ ...user, id: 'user-id' })),
  };
  const service = new UsersService(repository as unknown as Repository<User>);

  const user = await service.create(dto);

  expect(repository.save).toHaveBeenCalledWith({
    fullName: dto.fullName,
    email: dto.email,
    phone: dto.phone,
    passwordHash: expect.any(String),
    role: UserRole.CUSTOMER,
    isVerified: false,
  });
  expect(user.role).toBe(UserRole.CUSTOMER);
  await expect(bcrypt.compare(dto.password, user.passwordHash)).resolves.toBe(
    true,
  );
});

it.each([
  { affected: 1, consumed: true },
  { affected: 0, consumed: false },
  { affected: 2, consumed: false },
])('consumes an OTP only when one row changes ($affected)', async ({
  affected,
  consumed,
}) => {
  const repository = {
    update: vi
      .fn<
        (
          criteria: FindOptionsWhere<User>,
          changes: Partial<User>,
        ) => Promise<{ affected: number }>
      >()
      .mockResolvedValue({ affected }),
  };
  const service = new UsersService(repository as unknown as Repository<User>);

  await expect(service.consumeOtp('user-id', 'expected-hash')).resolves.toBe(
    consumed,
  );
  expect(repository.update).toHaveBeenCalledExactlyOnceWith(
    {
      id: 'user-id',
      otp: 'expected-hash',
      otpExpiresAt: expect.any(FindOperator),
      isVerified: false,
    },
    { isVerified: true, otp: null, otpExpiresAt: null },
  );

  const [[criteria]] = repository.update.mock.calls;
  const expiry = criteria.otpExpiresAt as FindOperator<Date>;
  expect(expiry.getSql?.('"otpExpiresAt"')).toBe(
    '"otpExpiresAt" > clock_timestamp()',
  );
});
