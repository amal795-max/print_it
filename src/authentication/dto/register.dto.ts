import {
  IsEmail,
  IsPhoneNumber,
  IsString,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

interface PasswordFields {
  password: string;
}

@ValidatorConstraint({ name: 'passwordsMatch' })
class PasswordsMatchConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    return value === (args.object as PasswordFields).password;
  }
}

export class CreateAuthenticationDto {
  @IsEmail()
  email!: string;

  @IsPhoneNumber()
  phoneNumber!: string;

  @IsString()
  password!: string;

  @IsString()
  @Validate(PasswordsMatchConstraint)
  confirmPassword!: string;
}
