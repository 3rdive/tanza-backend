import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRegDto } from '../auth/models/user-reg.dto';
import { Role } from '../auth/roles.enum';
import { StandardResponse } from '../commons/standard-response';
import { OtpService } from '../otp/services/otp.service';
import { PasswordResetDto } from './models/password-reset.dto';
import { PasswordUpdateDto } from './models/password-update.dto';
import { ProfileUpdateDto } from './models/profile-update.dto';
import { UserProfileDto } from './models/user-profile.dto';
import { UserDetailsService } from './user-details.service';
import { UserMapper } from './user-mapper';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly otpService: OtpService,
    private readonly userDetailsService: UserDetailsService,
  ) {}

  async register(
    userRegDto: UserRegDto,
    role: Role,
    defaultAdmin: boolean = false,
  ): Promise<User> {
    const existingUserWithEmailOrMobile =
      await this.userDetailsService.findByEmailAndMobile(
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

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(StandardResponse.fail('user not found'));
    }
    return UserMapper.toProfileDto(user);
  }

  async updateProfile(userId: string, dto: ProfileUpdateDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(StandardResponse.fail('user not found'));
    }

    // Enforce once-per-month updates for email and mobile
    const now = new Date();

    if (dto.email && dto.email !== user.email) {
      if (user.lastEmailUpdate) {
        const daysSince =
          (now.getTime() - new Date(user.lastEmailUpdate).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSince < 30) {
          const remaining = Math.ceil(30 - daysSince);
          throw new BadRequestException(
            StandardResponse.fail(
              `Email can only be updated once every 30 days. Please try again in ${remaining} day(s).`,
            ),
          );
        }
      }
      const emailExists = await this.userRepository.exists({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new BadRequestException(
          StandardResponse.fail('email already in use'),
        );
      }
      user.email = dto.email.trim().toLowerCase();
      user.lastEmailUpdate = now;
    }

    if (dto.mobile && dto.mobile !== user.mobile) {
      if (user.lastMobileUpdate) {
        const daysSince =
          (now.getTime() - new Date(user.lastMobileUpdate).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSince < 30) {
          const remaining = Math.ceil(30 - daysSince);
          throw new BadRequestException(
            StandardResponse.fail(
              `Mobile number can only be updated once every 30 days. Please try again in ${remaining} day(s).`,
            ),
          );
        }
      }
      const exists = await this.userRepository.exists({
        where: { mobile: dto.mobile },
      });
      if (exists) {
        throw new BadRequestException(
          StandardResponse.fail('mobile already in use'),
        );
      }
      user.mobile = dto.mobile.trim().toLowerCase();
      user.lastMobileUpdate = now;
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.profilePic !== undefined) user.profilePic = dto.profilePic;
    if (dto.countryCode !== undefined) user.countryCode = dto.countryCode;

    const saved = await this.userRepository.save(user);
    return UserMapper.toProfileDto(saved);
  }

  async updatePassword(userId: string, dto: PasswordUpdateDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(StandardResponse.fail('user not found'));
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException(
        StandardResponse.fail('current password is incorrect'),
      );
    }

    const saltRounds = 10;

    user.password = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.userRepository.save(user);
    return StandardResponse.ok(
      'Password changed successfully',
      'Password changed successfully',
    );
  }

  async updateProfilePic(userId: string, imageUrl: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(StandardResponse.fail('user not found'));
    }
    user.profilePic = imageUrl;
    const saved = await this.userRepository.save(user);
    return UserMapper.toProfileDto(saved);
  }
}
