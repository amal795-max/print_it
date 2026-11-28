import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { UserRole } from '../roles/user-role.enum.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';

describe('RegisterDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata = { type: 'body', metatype: RegisterDto } as const;

  const createDto = (overrides: Partial<RegisterDto> = {}) =>
    Object.assign(new RegisterDto(), {
      fullName: 'Jane Doe',
      email: 'user@example.com',
      phone: '+14155552671',
      password: 'Str0ng!Pass',
      ...overrides,
    });

  it('accepts a valid registration payload', async () => {
    await expect(pipe.transform({ ...createDto() }, metadata)).resolves.toEqual(
      createDto(),
    );
  });

  it('rejects a weak password', async () => {
    const errors = await validate(createDto({ password: 'stringst' }));

    expect(errors.map(({ property }) => property)).toContain('password');
  });

  it('rejects a client-supplied admin role', async () => {
    const payload = { ...createDto(), role: UserRole.ADMIN };

    await expect(pipe.transform(payload, metadata)).rejects.toMatchObject({
      response: {
        statusCode: 400,
        message: ['property role should not exist'],
      },
    });
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
