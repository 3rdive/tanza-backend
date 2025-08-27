import { IsNotEmpty, Length } from 'class-validator';

export class PasswordResetDto {
  @IsNotEmpty({ message: 'password is required' })
  password: string;

  @IsNotEmpty({ message: 'code is required' })
  @Length(4, 4, { message: 'code must be 4 characters' })
  code: string;
  @IsNotEmpty({ message: 'reference is required' })
  reference: string;
}
