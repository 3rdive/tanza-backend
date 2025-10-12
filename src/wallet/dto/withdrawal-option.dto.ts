import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWithdrawalOptionDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankHoldersName: string;
}

export class UpdateWithdrawalOptionDto {
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  bankHoldersName?: string;
}
