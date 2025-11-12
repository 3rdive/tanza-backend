import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RiderService } from '../services/rider.service';
import { BaseUrl } from '../../constants';
import { Role } from '../../auth/roles.enum';
import { Roles } from '../../auth/roles.decorator';
import { AdminUpdateRiderInfoDto } from '../dto/admin-update-rider-info.dto';
import { DocumentStatus } from '../document-status.enum';
import { StandardResponse } from '../../commons/standard-response';
import { VehicleDocumentSettingsService } from '../services/vehicle-document-settings.service';
import {
  CreateVehicleDocumentSettingDto,
  UpdateVehicleDocumentSettingDto,
} from '../dto/vehicle-document-settings.dto';
import { RiderDocumentService } from '../services/rider-document.service';
import { UpdateDocumentStatusDto } from '../dto/rider-document.dto';
import { VehicleType } from '../../order/entities/vehicle-type.enum';

@Roles(Role.RIDER)
@Controller(BaseUrl.ADMIN)
export class AdminController {
  constructor(
    private readonly riderService: RiderService,
    private readonly vehicleDocumentSettingsService: VehicleDocumentSettingsService,
    private readonly riderDocumentService: RiderDocumentService,
  ) {}

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

  // Vehicle Document Settings Endpoints
  @Post('vehicle-document-settings')
  async createDocumentSetting(@Body() dto: CreateVehicleDocumentSettingDto) {
    return StandardResponse.ok(
      await this.vehicleDocumentSettingsService.create(dto),
      'Document setting created successfully',
    );
  }

  @Get('vehicle-document-settings')
  async getAllDocumentSettings() {
    return StandardResponse.ok(
      await this.vehicleDocumentSettingsService.findAll(),
      'Document settings retrieved successfully',
    );
  }

  @Get('vehicle-document-settings/vehicle-type/:vehicleType')
  async getDocumentSettingsByVehicleType(
    @Param('vehicleType') vehicleType: VehicleType,
  ) {
    return StandardResponse.ok(
      await this.vehicleDocumentSettingsService.findByVehicleType(vehicleType),
      'Document settings retrieved successfully',
    );
  }

  @Get('vehicle-document-settings/:id')
  async getDocumentSetting(@Param('id') id: string) {
    return StandardResponse.ok(
      await this.vehicleDocumentSettingsService.findOne(id),
      'Document setting retrieved successfully',
    );
  }

  @Patch('vehicle-document-settings/:id')
  async updateDocumentSetting(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDocumentSettingDto,
  ) {
    return StandardResponse.ok(
      await this.vehicleDocumentSettingsService.update(id, dto),
      'Document setting updated successfully',
    );
  }

  @Delete('vehicle-document-settings/:id')
  async deleteDocumentSetting(@Param('id') id: string) {
    await this.vehicleDocumentSettingsService.remove(id);
    return StandardResponse.ok(null, 'Document setting deleted successfully');
  }

  // Rider Document Approval Endpoints
  @Patch('riders/documents/:documentId/status')
  async updateRiderDocumentApprovalStatus(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentStatusDto,
  ) {
    return StandardResponse.ok(
      await this.riderDocumentService.updateDocumentStatus(documentId, dto),
      'Document status updated successfully',
    );
  }
}
