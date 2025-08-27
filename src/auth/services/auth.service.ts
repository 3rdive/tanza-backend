import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { StandardResponse } from '../../commons/standard-response';
import { PasswordResetDto } from '../../users/models/password-reset.dto';
import { UserMapper } from '../../users/user-mapper';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRegDto } from '../models/user-reg.dto';
import { UserResponseDto } from '../models/user-response.dto';
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
  ): Promise<{ access_token: string; user?: UserResponseDto }> {
    const hashPassword = await this.hashString(userDto.password);
    userDto.password = hashPassword;
    console.log(userDto);
    const user = await this.usersService.register(userDto, Role.User);
    const payload = { role: user.role, sub: user.id };
    const token = await this.jwtService.signAsync(payload);
    return {
      access_token: token,
      user: UserMapper.toResponseDto(user),
    };
  }

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    const user = await this.usersService.findOne(username);
    if (!user)
      throw new UnauthorizedException(StandardResponse.fail('User not found'));

    const isPasswordMatch = await this.compareWithHashString({
      plainPassword: pass,
      hashPassword: user?.password,
    });
    if (!isPasswordMatch) {
      throw new UnauthorizedException(
        StandardResponse.fail('User name or password is incorrect'),
      );
    }

    const payload = { role: user.role, sub: user.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: UserMapper.toResponseDto(user),
    };
  }

  async resetPassword(passwordResetDto: PasswordResetDto) {
    const user = await this.usersService.findOne(passwordResetDto.reference);

    if (!user) {
      throw new NotFoundException(StandardResponse.fail('user not found'));
    }

    user.password = await this.hashString(passwordResetDto.password);
    await this.usersService.updateResetPassword(user, passwordResetDto);
    return StandardResponse.ok(
      'Password reset successfully',
      'Password reset successfully',
    );
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
