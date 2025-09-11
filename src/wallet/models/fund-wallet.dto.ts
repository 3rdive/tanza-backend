import { IsNotEmpty, IsString } from 'class-validator';

export class FundWalletDto {
  @IsString()
  @IsNotEmpty()
  customerCode: string;

  @IsString()
  @IsNotEmpty()
  transactionReference: string;
}
