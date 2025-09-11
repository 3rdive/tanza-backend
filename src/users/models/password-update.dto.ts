import { IsString, MinLength } from 'class-validator';

export class PasswordUpdateDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
