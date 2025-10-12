import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';
import { BaseUrl } from '../../constants';
import { CurrentUser } from '../user.decorator';
import { JwtPayload } from '../../auth/models/jwt-payload.type';
import { RiderService } from '../services/rider.service';
import { UpdateRiderInfoDto } from '../dto/update-rider-info.dto';

@Roles(Role.RIDER)
@Controller(BaseUrl.RIDERS)
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Get('me')
  async getMyRiderInfo(@CurrentUser() user: JwtPayload) {
    if (!user) throw new BadRequestException('Unauthorized');
    return this.riderService.getRiderInfo(user.sub);
  }

  @Patch('me')
  async updateMyRiderInfo(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRiderInfoDto,
  ) {
    if (!user) throw new BadRequestException('Unauthorized');
    return this.riderService.updateRiderInfo(user.sub, dto);
  }
}
