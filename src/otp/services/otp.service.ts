import {
  BadRequestException,
  forwardRef,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StandardResponse } from '../../commons/standard-response';
import { ConsumeOtp } from '../consume-otp.dto';
import { UsersService } from '../../users/users.service';
import { OtpCreateEvent } from '../events/otp-create.event';
import { OtpsEntity } from '../otps.entity';
import { OtpDto } from '../otp.dto';

export class OtpService {
  constructor(
    @InjectRepository(OtpsEntity)
    private readonly otpRepository: Repository<OtpsEntity>,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
  ) {}

  async createOtp(otpDto: OtpDto) {
    const otp = new OtpsEntity();
    const code = this.generateFourDigitCode();
    otp.code = code;
    otp.reference = otpDto.reference;
    otp.otpType = otpDto.otpType;
    otp.expiration = new Date(
      new Date().setMinutes(new Date().getMinutes() + 30), //30Mins from now
    );

    new OtpCreateEvent(code, otpDto.reference);
    await this.otpRepository.save(otp);
    console.log(`Created Otp: ${otp.code} for ${otp.reference}`);
    //send otp
  }

  async consumeOtp(consumeOtp: ConsumeOtp) {
    const otp = await this.otpRepository.findOne({
      where: {
        reference: consumeOtp.reference,
        otpType: consumeOtp.otpType,
        code: consumeOtp.code,
      },
    });

    if (!otp) {
      throw new NotFoundException(StandardResponse.fail('Invalid Otp', null));
    }

    if (otp.used) {
      throw new BadRequestException(StandardResponse.fail('Otp already used'));
    }

    if (this.isExpired(otp)) {
      throw new BadRequestException(StandardResponse.fail('Otp Expired'));
    }

    otp.used = true;
    otp.timeUsed = new Date();
    await this.otpRepository.save(otp);

    return 'OTP Validated successfully';
  }

  private isExpired(otp: OtpsEntity) {
    return otp.expiration <= new Date();
  }

  async clearOtp(reference: string, code: string) {
    const otp = await this.otpRepository.findOne({
      where: {
        reference: reference,
        code: code,
      },
    });

    if (!otp?.used) {
      throw new BadRequestException(StandardResponse.fail('invalid otp', null));
    }

    if (this.isExpired(otp)) {
      throw new BadRequestException(StandardResponse.fail('Otp Expired', null));
    }
    await this.otpRepository.delete({ reference });
  }

  private generateFourDigitCode() {
    // Generate a random number between 1000 and 9999
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
