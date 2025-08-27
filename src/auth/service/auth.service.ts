import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRegDto } from '../model/user-reg.dto';
import { Role } from '../roles.enum';
import { User } from '../../users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async registerUser(
    userDto: UserRegDto,
  ): Promise<{ access_token: string; user?: User }> {
    userDto.password = await this.hashString(userDto.password);
    const user = await this.usersService.register(userDto, Role.User);
    const payload = { role: user.role, sub: user.id };
    const token = await this.jwtService.signAsync(payload);
    return {
      access_token: token,
      user,
    };
  }

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(username?.toLowerCase());
    if (!user) throw new UnauthorizedException('User not found');

    const isPasswordMatch = await this.compareWithHashString({
      plainPassword: pass,
      hashPassword: user?.password,
    });
    if (!isPasswordMatch) {
      throw new UnauthorizedException('User name or password is incorrect');
    }

    const payload = { role: user.role, sub: user.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async compareWithHashString({
    plainPassword,
    hashPassword,
  }: {
    plainPassword: string;
    hashPassword: string;
  }): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashPassword);
  }

  private async hashString(str: string): Promise<string> {
    const saltRounds = 10; // Define the cost factor for hashing
    return await bcrypt.hash(str, saltRounds);
  }
}
