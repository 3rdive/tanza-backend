import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StandardResponse } from '../../commons/standard-response';
import { User } from '../user.entity';

@Injectable()
export class UserDetailsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async findOneOrThrow(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(StandardResponse.fail('user not found'));
    }

    return user;
  }

  async findByMobile(mobile: string): Promise<boolean> {
    return this.userRepository.exists({
      where: { mobile: mobile },
    });
  }

  async findByEmail(email: string): Promise<boolean> {
    return this.userRepository.exists({
      where: { email: email },
    });
  }

  findByEmailAndMobile(email: string, mobile: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: [{ email: email }, { mobile: mobile }],
    });
  }
}
