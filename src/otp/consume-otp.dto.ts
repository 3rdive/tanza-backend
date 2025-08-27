import { IsNotEmpty } from 'class-validator';
import { OtpDto } from './otp.dto';

export class ConsumeOtp extends OtpDto {
  @IsNotEmpty({ message: 'Code is required' })
  code: string;
}
