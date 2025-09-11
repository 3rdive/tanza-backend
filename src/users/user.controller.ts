import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { JwtPayload } from '../auth/models/jwt-payload.type';
import { Public } from '../auth/public.anotation';
import { BaseUrl } from '../constants';
import { UserDetailsService } from './user-details.service';
import { CurrentUser } from './user.decorator';
import { UsersService } from './users.service';
import { ProfileUpdateDto } from './models/profile-update.dto';
import { PasswordUpdateDto } from './models/password-update.dto';

@Controller(BaseUrl.USER)
export class UserController {
  constructor(
    private readonly userDetailsService: UserDetailsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('test-context')
  testContext(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Public()
  @Get('exists/mobile')
  async findByMobile(@Query('mobile') mobile?: string) {
    if (!mobile) {
      throw new BadRequestException('mobile is required');
    }
    const exists = await this.userDetailsService.findByMobile(
      mobile.trim().toLowerCase(),
    );
    return { exists };
  }

  @Public()
  @Get('exists/email')
  async findByEmail(@Query('email') email?: string) {
    if (!email) {
      throw new BadRequestException('email is required');
    }
    const exists = await this.userDetailsService.findByEmail(
      email.trim().toLowerCase(),
    );
    return { exists };
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    if (!user) {
      throw new BadRequestException('Unauthorized');
    }
    return this.usersService.getProfile(user.sub);
  }

  @Get('profile/update')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Query() dto: ProfileUpdateDto,
  ) {
    if (!user) {
      throw new BadRequestException('Unauthorized');
    }
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get('password/update')
  async updatePassword(
    @CurrentUser() user: JwtPayload,
    @Query() dto: PasswordUpdateDto,
  ) {
    if (!user) {
      throw new BadRequestException('Unauthorized');
    }
    return this.usersService.updatePassword(user.sub, dto);
  }

  @Get('profile/pic/update')
  async updateProfilePic(
    @CurrentUser() user: JwtPayload,
    @Query('imageUrl') imageUrl?: string,
  ) {
    if (!user) {
      throw new BadRequestException('Unauthorized');
    }
    if (!imageUrl || !imageUrl.trim()) {
      throw new BadRequestException('imageUrl is required');
    }
    return this.usersService.updateProfilePic(user.sub, imageUrl.trim());
  }
}
