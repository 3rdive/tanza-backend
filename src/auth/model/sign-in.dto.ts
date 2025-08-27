import { IsNotEmpty, Length } from 'class-validator';

export class SignInDto {
  @IsNotEmpty({ message: 'emailOrMobile is required' })
  emailOrMobile: string;

  @IsNotEmpty({ message: 'password is required' })
  @Length(8, 20, { message: 'password must be between 8 and 20 characters' })
  password: string;
}
