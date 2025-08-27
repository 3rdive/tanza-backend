import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRegDto } from '../auth/model/user-reg.dto';
import { Role } from '../auth/roles.enum';
import { UserMapper } from './user-mapper';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async register(userRegDto: UserRegDto, role: Role): Promise<User> {
    const existingUserWithUsername = await this.findByEmailAndMobile(
      userRegDto.email,
      userRegDto.mobile,
    );

    if (existingUserWithUsername) {
      throw new BadRequestException('Username already exists');
    }
    const user = UserMapper.toEntity(userRegDto);
    user.role = role;
    return this.userRepository.save(user);
  }
}
