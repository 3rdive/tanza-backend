import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';
import { BaseUrl } from '../../constants';
import { CurrentUser } from '../user.decorator';
import { JwtPayload } from '../../auth/models/jwt-payload.type';
import {
  ActiveStatusService,
  UpdateActiveStatusDto,
} from '../services/active-status.service';

@Roles(Role.RIDER)
@Controller(BaseUrl.RIDERS_STATUS)
export class ActiveStatusController {
  constructor(private readonly activeStatusService: ActiveStatusService) {}

  @Get()
  async getMyActiveStatus(@CurrentUser() user: JwtPayload) {
    const record = await this.activeStatusService.initialize(
      user.sub,
      'inactive',
    );
    return record;
  }

  @Put()
  async updateMyActiveStatus(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateActiveStatusDto,
  ) {
    if (!user) throw new BadRequestException('Unauthorized');

    if (dto.status && dto.status !== 'active' && dto.status !== 'inactive') {
      throw new BadRequestException('status must be active or inactive');
    }

    return this.activeStatusService.update(user.sub, dto);
  }
}
