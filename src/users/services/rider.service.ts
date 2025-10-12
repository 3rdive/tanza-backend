import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiderInfo } from '../rider-info.entity';
import { ActiveStatusService } from './active-status.service';
import { RiderInfoDto } from '../dto/rider-info.dto';
import { UpdateRiderInfoDto } from '../dto/update-rider-info.dto';
import { StandardResponse } from '../../commons/standard-response';
import { USER_DOCUMENT_STATUS_ALLOWED } from '../dto/update-rider-info.dto';
import { DocumentStatus } from '../document-status.enum';
import { RiderMapper } from '../rider.mapper';
import { AdminUpdateRiderInfoDto } from '../dto/admin-update-rider-info.dto';

@Injectable()
export class RiderService {
  constructor(
    private readonly activeStatusService: ActiveStatusService,
    @InjectRepository(RiderInfo)
    private readonly riderInfoRepository: Repository<RiderInfo>,
  ) {}

  async initRiderInfo(userId: string) {
    const riderInfo = this.riderInfoRepository.create({ userId });
    await this.activeStatusService.initialize(userId);
    return await this.riderInfoRepository.save(riderInfo);
  }

  async getRiderInfo(userId: string): Promise<RiderInfoDto> {
    const info = await this.riderInfoRepository.findOne({ where: { userId } });
    if (!info) {
      throw new BadRequestException(
        StandardResponse.fail('rider info not found'),
      );
    }
    return RiderMapper.toDto(info);
  }

  async updateRiderInfo(
    userId: string,
    dto: UpdateRiderInfoDto,
  ): Promise<RiderInfoDto> {
    const info = await this.riderInfoRepository.findOne({ where: { userId } });
    if (!info) {
      throw new BadRequestException(
        StandardResponse.fail('rider info not found'),
      );
    }

    if (dto.vehicleType !== undefined) info.vehicleType = dto.vehicleType;
    if (dto.vehiclePhoto !== undefined) info.vehiclePhoto = dto.vehiclePhoto;
    if (dto.driverLicense !== undefined) info.driverLicense = dto.driverLicense;
    if (dto.vehiclePapers !== undefined) info.vehiclePapers = dto.vehiclePapers;
    if (dto.documentStatus !== undefined) {
      if (!USER_DOCUMENT_STATUS_ALLOWED.includes(dto.documentStatus)) {
        throw new BadRequestException(
          StandardResponse.fail(
            'documentStatus must be INITIAL, PENDING, or SUBMITTED',
          ),
        );
      }
      info.documentStatus = dto.documentStatus;
    }

    const saved = await this.riderInfoRepository.save(info);
    return RiderMapper.toDto(saved);
  }

  async getAllPendingRiderDocument(
    status: DocumentStatus,
  ): Promise<RiderInfoDto[]> {
    const riders = await this.riderInfoRepository.find({
      where: { documentStatus: status },
    });
    return riders.map((r) => RiderMapper.toDto(r));
  }

  async updateRiderDocumentStatus(
    updateRiderDocumentStatus: AdminUpdateRiderInfoDto,
  ): Promise<RiderInfoDto> {
    const { riderInfoId, status, rejectionReason } = updateRiderDocumentStatus;
    const info = await this.riderInfoRepository.findOne({
      where: { id: riderInfoId },
    });
    if (!info) {
      throw new BadRequestException(
        StandardResponse.fail('rider info not found'),
      );
    }

    info.documentStatus = status;
    if (status === DocumentStatus.REJECTED && rejectionReason) {
      info.rejectionReason = rejectionReason;
    } else {
      info.rejectionReason = '';
    }
    const saved = await this.riderInfoRepository.save(info);
    return RiderMapper.toDto(saved);
  }
}
