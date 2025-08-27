import { IsEnum, IsNotEmpty } from 'class-validator';
import { OtpType } from './OtpTypes';

export class OtpDto {
  @IsNotEmpty({ message: 'reference is required' })
  reference: string; //email or mobile

  @IsNotEmpty({ message: 'reference is required' })
  @IsEnum(OtpType)
  otpType: OtpType;
}
