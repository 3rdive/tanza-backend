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
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';
import { BaseUrl } from '../../constants';
import { CurrentUser } from '../user.decorator';
import { JwtPayload } from '../../auth/models/jwt-payload.type';
import { RiderService } from '../services/rider.service';
import { UpdateRiderInfoDto } from '../dto/update-rider-info.dto';
import { RiderDocumentService } from '../services/rider-document.service';
import { UploadMultipleDocumentsDto } from '../dto/rider-document.dto';
import { StandardResponse } from '../../commons/standard-response';

@Roles(Role.RIDER)
@Controller(BaseUrl.RIDERS)
export class RiderController {
  constructor(
    private readonly riderService: RiderService,
    private readonly riderDocumentService: RiderDocumentService,
  ) {}

  @Get('me')
  async getMyRiderInfo(@CurrentUser() user: JwtPayload) {
    return this.riderService.getRiderInfo(user.sub);
  }

  @Patch('me')
  async updateMyRiderInfo(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRiderInfoDto,
  ) {
    return this.riderService.updateRiderInfo(user.sub, dto);
  }

  // Document Management Endpoints
  @Post('me/documents')
  async uploadDocuments(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadMultipleDocumentsDto,
  ) {
    const uploaded = await this.riderDocumentService.uploadMultipleDocuments(
      user.sub,
      dto.documents,
    );
    return StandardResponse.ok(uploaded, 'Documents uploaded successfully');
  }

  @Get('me/documents')
  async getMyDocuments(@CurrentUser() user: JwtPayload) {
    if (!user) throw new BadRequestException('Unauthorized');

    // Get rider info first
    const riderInfo = await this.riderService.getRiderInfo(user.sub);

    return StandardResponse.ok(
      await this.riderDocumentService.getDocumentsByRiderInfo(riderInfo.id),
      'Documents retrieved successfully',
    );
  }

  @Get('me/documents/required')
  async getRequiredDocuments(@Query('vehicleType') vehicleType: string) {
    // Get rider info first

    return StandardResponse.ok(
      await this.riderDocumentService.getRequiredDocuments(vehicleType),
      'Required documents retrieved successfully',
    );
  }

  @Delete('me/documents/:documentId')
  async deleteDocument(
    @CurrentUser() user: JwtPayload,
    @Param('documentId') documentId: string,
  ) {
    await this.riderDocumentService.deleteDocument(documentId);
    return StandardResponse.ok(null, 'Document deleted successfully');
  }
}
