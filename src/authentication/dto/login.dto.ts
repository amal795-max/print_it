import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateAuthenticationDto } from './register.dto.js';

export class LoginDto extends PartialType(
  PickType(CreateAuthenticationDto, ['email', 'password'] as const),
) {}

export class UpdateAuthenticationDto extends PartialType(CreateAuthenticationDto) {}
