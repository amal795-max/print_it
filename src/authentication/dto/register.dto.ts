import {
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../roles/user-role.enum.js';

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName!: string;

  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @IsString()
  @MinLength(3, { message: 'Phone must be at least 3 characters' })
  phone!: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character',
  })
  password!: string;

  @IsEnum(UserRole, { message: 'Role must be CUSTOMER or ADMIN' })
  role!: UserRole;
}
