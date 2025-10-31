import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateAccountDto {
  @IsNotEmpty()
  @IsString()
  account_number: string;

  @IsNotEmpty()
  @IsString()
  bank_code: string;
}
