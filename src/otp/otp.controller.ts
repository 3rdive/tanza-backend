import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BaseUrl } from '../constants';
import { OtpService } from './services/otp.service';
import { OtpDto } from './otp.dto';
import { ConsumeOtp } from './consume-otp.dto';
import { Public } from '../auth/public.anotation';

@Public()
@Controller(BaseUrl.OTP)
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: OtpDto) {
    await this.otpService.createOtp(dto);
    return 'OTP created successfully';
  }

  @Public()
  @Post('consume')
  @HttpCode(HttpStatus.OK)
  async consume(@Body() dto: ConsumeOtp) {
    const result = await this.otpService.consumeOtp(dto);
    return { message: result };
  }
}
