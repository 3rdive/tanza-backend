import { BadRequestException, Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRegDto } from '../../auth/models/user-reg.dto';
import { Role } from '../../auth/roles.enum';
import { StandardResponse } from '../../commons/standard-response';
import { OtpService } from '../../otp/services/otp.service';
import { InitRiderEvent } from '../init-rider.event';
import { UserMapper } from '../user-mapper';
import { User } from '../user.entity';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly eventBus: EventBus,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly otpService: OtpService,
  ) {}
  async execute(
    userRegDto: UserRegDto,
    role: Role,
    defaultAdmin: boolean = false,
  ): Promise<User> {
    const existingUserWithEmailOrMobile = await this.userRepository.findOne({
      where: [{ email: userRegDto.email }, { mobile: userRegDto.mobile }],
    });

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
    const savedUser = await this.userRepository.save(user);

    if (role == Role.RIDER) {
      await this.eventBus.publish(new InitRiderEvent(savedUser.id));
    }

    return savedUser;
  }
}
