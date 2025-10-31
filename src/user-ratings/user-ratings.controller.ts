import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';
import { BaseUrl } from '../constants';
import { CurrentUser } from '../users/user.decorator';
import { JwtPayload } from '../auth/models/jwt-payload.type';
import { PaginationDto } from '../commons/pagination.dto';
import { RateUserDto } from './dto/rate-user.dto';
import { UserRatingsService } from './user-ratings.service';

@Controller(BaseUrl.RATINGS)
export class UserRatingsController {
  constructor(private readonly service: UserRatingsService) {}

  @Post('rate')
  async rate(@CurrentUser() user: JwtPayload, @Body() dto: RateUserDto) {
    return this.service.rateUser(user.sub, dto);
  }

  @Get(':ratingId')
  async getById(@Param('ratingId') ratingId: string) {
    return this.service.getById(ratingId);
  }

  @Get('user/:targetUserId')
  async listUserRatings(
    @Param('targetUserId') targetUserId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.service.listUserRatings(targetUserId, paginationDto);
  }
}
