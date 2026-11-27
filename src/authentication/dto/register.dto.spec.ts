import { validate } from 'class-validator';
import { UserRole } from '../roles/user-role.enum.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';

describe('RegisterDto', () => {
  const createDto = (overrides: Partial<RegisterDto> = {}) =>
    Object.assign(new RegisterDto(), {
      fullName: 'Jane Doe',
      email: 'user@example.com',
      phone: '+14155552671',
      password: 'Str0ng!Pass',
      role: UserRole.CUSTOMER,
      ...overrides,
    });

  it('accepts a valid registration payload', async () => {
    const errors = await validate(createDto());

    expect(errors).toHaveLength(0);
  });

  it('rejects a weak password', async () => {
    const errors = await validate(createDto({ password: 'stringst' }));

    expect(errors.map(({ property }) => property)).toContain('password');
  });

  it('rejects an invalid role', async () => {
    const errors = await validate(
      createDto({ role: 'UNKNOWN' as UserRole }),
    );

    expect(errors.map(({ property }) => property)).toContain('role');
  });

  it('validates login credentials without registration-only fields', async () => {
    const dto = Object.assign(new LoginDto(), {
      email: 'user@example.com',
      password: 'password',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
