import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BaseUrl } from '../../constants';
import { CurrentUser } from '../../users/user.decorator';
import { JwtPayload } from '../../auth/models/jwt-payload.type';
import {
  CreateWithdrawalOptionDto,
  UpdateWithdrawalOptionDto,
} from '../dto/withdrawal-option.dto';
import { WithdrawalOptionsService } from '../services/withdrawal-options.service';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';

@Roles(Role.RIDER)
@Controller(`${BaseUrl.WALLET}/withdrawal-options`)
export class WithdrawalOptionsController {
  constructor(private readonly service: WithdrawalOptionsService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWithdrawalOptionDto,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.service.findAllForRider(user.sub);
  }

  @Get(':id')
  async get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOneForRider(user.sub, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawalOptionDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Patch(':id/default')
  async setDefault(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.setDefault(user.sub, id);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.sub, id);
  }
}
