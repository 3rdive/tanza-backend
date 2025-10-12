import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { StandardResponse } from '../../commons/standard-response';
import { PasswordResetDto } from '../../users/models/password-reset.dto';
import { RegMode } from '../../users/reg-mode.enum';
import { UserDetailsService } from '../../users/services/user-details.service';
import { UserMapper } from '../../users/user-mapper';
import { UsersService } from '../../users/services/users.service';
import { UserRegDto } from '../models/user-reg.dto';
import { UserResponseDto } from '../models/user-response.dto';
import { Role } from '../roles.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private userDetailsService: UserDetailsService,
    private jwtService: JwtService,
  ) {}

  async registerUser(
    userDto: UserRegDto,
  ): Promise<{ access_token: string; user?: UserResponseDto }> {
    if (userDto.role == Role.User) {
      if (!userDto.email) {
        throw new BadRequestException(
          new StandardResponse(false, 'email is required', null),
        );
      } else if (!userDto.usersAddress) {
        throw new BadRequestException(
          new StandardResponse(false, 'userAddress is required', null),
        );
      }
    }
    userDto.password = await this.hashString(userDto.password);
    const user = await this.usersService.register(userDto, userDto.role);
    const payload = { role: user.role, sub: user.id };
    const token = await this.jwtService.signAsync(payload);
    return {
      access_token: token,
      user: UserMapper.toProfileDto(user),
    };
  }

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    const user = await this.userDetailsService.findByEmailAndMobile(
      username,
      username,
    );
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
      user: UserMapper.toProfileDto(user),
    };
  }

  async resetPassword(passwordResetDto: PasswordResetDto) {
    const user = await this.userDetailsService.findByEmailAndMobile(
      passwordResetDto.reference,
      passwordResetDto.reference,
    );

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

  async checkEmailMobileExisting(
    emailOrMobile: string,
  ): Promise<{ exists: boolean; registrationMode: RegMode | undefined }> {
    const user = await this.userDetailsService.findByEmailAndMobile(
      emailOrMobile,
      emailOrMobile,
    );
    return {
      exists: !!user,
      registrationMode: user?.registrationMode,
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
