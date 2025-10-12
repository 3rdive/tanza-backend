import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Query,
} from '@nestjs/common';
import { RiderService } from '../services/rider.service';
import { BaseUrl } from '../../constants';
import { Role } from '../../auth/roles.enum';
import { Roles } from '../../auth/roles.decorator';
import { AdminUpdateRiderInfoDto } from '../dto/admin-update-rider-info.dto';
import { DocumentStatus } from '../document-status.enum';
import { StandardResponse } from '../../commons/standard-response';

@Roles(Role.RIDER)
@Controller(BaseUrl.ADMIN)
export class AdminController {
  constructor(private readonly riderService: RiderService) {}

  @Patch('riders/document-status')
  async updateRiderDocumentStatus(
    @Body() updateRiderDocumentStatus: AdminUpdateRiderInfoDto,
  ) {
    return await this.riderService.updateRiderDocumentStatus(
      updateRiderDocumentStatus,
    );
  }

  @Get('riders/document-status')
  async getRiderDocumentStatus(@Query('status') status: string) {
    const allowed = [
      DocumentStatus.INITIAL,
      DocumentStatus.PENDING,
      DocumentStatus.APPROVED,
      DocumentStatus.SUBMITTED,
      DocumentStatus.REJECTED,
    ];

    if (!allowed.includes(status as DocumentStatus)) {
      throw new BadRequestException(
        StandardResponse.fail(
          `Invalid status. Allowed values are ${allowed.join(', ')}.`,
        ),
      );
    }
    return await this.riderService.getAllPendingRiderDocument(
      status as DocumentStatus,
    );
  }
}
