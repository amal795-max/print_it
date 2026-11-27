import { validate } from 'class-validator';
import { LoginDto } from './login.dto.js';
import { CreateAuthenticationDto } from './register.dto.js';

describe('CreateAuthenticationDto', () => {
  const createDto = (password: string, confirmPassword: string) =>
    Object.assign(new CreateAuthenticationDto(), {
      email: 'user@example.com',
      phoneNumber: '+14155552671',
      password,
      confirmPassword,
    });

  it('accepts valid contact details and matching passwords', async () => {
    const errors = await validate(createDto('password', 'password'));

    expect(errors).toHaveLength(0);
  });

  it('rejects a confirmation that does not match the password', async () => {
    const errors = await validate(createDto('password', 'different'));

    expect(errors.map(({ property }) => property)).toContain('confirmPassword');
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
