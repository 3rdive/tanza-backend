import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRegDto } from '../auth/models/user-reg.dto';
import { Role } from '../auth/roles.enum';
import { StandardResponse } from '../commons/standard-response';
import { OtpService } from '../otp/services/otp.service';
import { PasswordResetDto } from './models/password-reset.dto';
import { UserMapper } from './user-mapper';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly otpService: OtpService,
  ) {}

  findOne(emailOrMobile: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: [{ email: emailOrMobile }, { mobile: emailOrMobile }],
    });
  }

  findByEmailAndMobile(email: string, mobile: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, mobile },
    });
  }

  async register(
    userRegDto: UserRegDto,
    role: Role,
    defaultAdmin: boolean = false,
  ): Promise<User> {
    const existingUserWithEmailOrMobile = await this.findByEmailAndMobile(
      userRegDto.email,
      userRegDto.mobile,
    );

    if (existingUserWithEmailOrMobile) {
      throw new BadRequestException(
        StandardResponse.fail('Username already exists'),
      );
    }

    if (!defaultAdmin) {
      await this.otpService.clearOtp(userRegDto.mobile, userRegDto.otp);
    }

    const user = UserMapper.toEntity(userRegDto);
    user.role = role;
    return this.userRepository.save(user);
  }
  async updateResetPassword(user: User, passwordResetDto: PasswordResetDto) {
    await this.otpService.clearOtp(
      passwordResetDto.reference,
      passwordResetDto.code,
    );

    await this.userRepository.save(user);
  }
}
