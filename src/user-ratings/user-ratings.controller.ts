import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { BaseUrl } from '../constants';
import { CurrentUser } from '../users/user.decorator';
import { JwtPayload } from '../auth/models/jwt-payload.type';
import { PaginationDto } from '../commons/pagination.dto';
import { RateRiderDto } from './dto/rate-rider.dto';
import { UserRatingsService } from './user-ratings.service';

@Controller(BaseUrl.RATINGS)
export class UserRatingsController {
  constructor(private readonly service: UserRatingsService) {}

  @Post('rate')
  async rate(@CurrentUser() user: JwtPayload, @Body() dto: RateRiderDto) {
    if (!user) throw new BadRequestException('Unauthorized');
    return this.service.rateRider(user.sub, dto);
  }

  @Get('by-rider-user')
  async getByRiderAndUser(
    @Query('riderId') riderId: string,
    @Query('userId') userId: string,
  ) {
    if (!riderId || !userId)
      throw new BadRequestException('riderId and userId are required');
    return this.service.getByRiderAndUser(riderId, userId);
  }

  @Get(':ratingId')
  async getById(@Param('ratingId') ratingId: string) {
    return this.service.getById(ratingId);
  }

  @Get('rider/:riderId')
  async listForRider(
    @Param('riderId') riderId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.service.listRiderRatings(riderId, paginationDto);
  }
}
