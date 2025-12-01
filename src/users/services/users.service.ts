import {
  BadRequestException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { StandardResponse } from '../../commons/standard-response';
import { OtpService } from '../../otp/services/otp.service';
import { PasswordResetDto } from '../models/password-reset.dto';
import { PasswordUpdateDto } from '../models/password-update.dto';
import { ProfileUpdateDto } from '../models/profile-update.dto';
import { UserProfileDto } from '../models/user-profile.dto';
import { UserAddress } from '../user-address';
import { UserMapper } from '../user-mapper';
import { User } from '../user.entity';
import { SearchUserDto } from '../dto/search-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => OtpService))
    private readonly otpService: OtpService,
  ) {}

  async existsOrFail(userId: string) {
    const response = await this.userRepository.exists({
      where: { id: userId },
    });

    if (!response) {
      throw new BadRequestException(StandardResponse.fail('user not found'));
    }
  }
  async updateResetPassword(user: User, passwordResetDto: PasswordResetDto) {
    await this.otpService.clearOtp(
      passwordResetDto.reference,
      passwordResetDto.code,
    );

    await this.userRepository.save(user);
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['riderInfo'],
    });
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

    if (
      dto.usersAddress?.name &&
      dto.usersAddress?.lat &&
      dto.usersAddress?.lon
    ) {
      user.usersAddress = dto.usersAddress;
    }

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
    await this.userRepository.save(user);
    return 'profile pic updated successfully';
  }

  async updateUserAddress(userId: string, address: UserAddress) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(StandardResponse.fail('user not found'));
    }
    user.usersAddress = address;
    await this.userRepository.save(user);
    return 'address updated successfully';
  }

  async setPushNotificationToken(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(StandardResponse.fail('user not found'));
    }
    user.expoPushNotificationToken = token;
    user.hasSetUpNotification = true;
    await this.userRepository.save(user);
    return StandardResponse.ok(
      'Push notification token set successfully',
      'Push notification token set successfully',
    );
  }

  async searchUsers(
    dto: SearchUserDto,
  ): Promise<StandardResponse<UserProfileDto>> {
    const { query, limit = 10, page = 1 } = dto;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.riderInfo', 'riderInfo');

    if (query && query.trim()) {
      const searchTerm = `%${query.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        "(LOWER(user.mobile) LIKE :searchTerm OR LOWER(user.email) LIKE :searchTerm OR LOWER(user.firstName) LIKE :searchTerm OR LOWER(user.lastName) LIKE :searchTerm OR LOWER(CONCAT(user.firstName, ' ', user.lastName)) LIKE :searchTerm)",
        { searchTerm },
      );
    }

    const skip = (page - 1) * limit;
    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.registrationDate', 'DESC');

    const [users, total] = await queryBuilder.getManyAndCount();

    const userDtos = users.map((user) => UserMapper.toProfileDto(user));

    return StandardResponse.withPagination(
      userDtos,
      'Users fetched successfully',
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    );
  }
}
