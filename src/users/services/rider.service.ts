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
import { ActiveStatus } from '../active-status.entity';

@Injectable()
export class RiderService {
  constructor(
    private readonly activeStatusService: ActiveStatusService,
    @InjectRepository(RiderInfo)
    private readonly riderInfoRepository: Repository<RiderInfo>,
    @InjectRepository(ActiveStatus)
    private readonly activeStatusRepository: Repository<ActiveStatus>,
  ) {}

  async initRiderInfo(userId: string) {
    const riderInfo = this.riderInfoRepository.create({ userId });
    await this.activeStatusService.initialize(userId);
    return await this.riderInfoRepository.save(riderInfo);
  }

  async getRiderInfo(userId: string): Promise<RiderInfoDto> {
    const info = await this.riderInfoRepository.findOne({
      where: { userId },
      relations: ['documents'],
    });
    if (!info) {
      throw new BadRequestException(
        StandardResponse.fail('rider info not found'),
      );
    }
    return RiderMapper.toDto(info, true);
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
      relations: ['documents'],
    });
    return riders.map((r) => RiderMapper.toDto(r, true));
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

  async getRiderForOrder(
    excludeRiderIds: string[] = [],
  ): Promise<string | null> {
    // First, get all riders with approved documents
    const approvedRiders = await this.riderInfoRepository.find({
      where: { documentStatus: DocumentStatus.APPROVED },
      relations: ['user'],
    });

    if (approvedRiders.length === 0) {
      return null;
    }

    // Get active status for all approved riders, excluding those who declined
    const riderIds = approvedRiders
      .map((r) => r.userId)
      .filter((id) => !excludeRiderIds.includes(id));

    if (riderIds.length === 0) {
      return null;
    }

    const activeStatuses = await this.activeStatusRepository
      .createQueryBuilder('activeStatus')
      .where('activeStatus.userId IN (:...riderIds)', { riderIds })
      .andWhere('activeStatus.status = :status', { status: 'active' })
      .getMany();

    if (activeStatuses.length === 0) {
      return null;
    }

    // For now, return the first active rider
    // TODO: Implement more sophisticated logic:
    // - Location-based matching (closest rider to pickup location)
    // - Rider workload (number of current active orders)
    // - Rider rating
    // - Vehicle type matching
    // - Time since last order assigned
    // - Random selection among equally qualified riders

    // - Round-robin assignment to ensure fair distribution of orders
    // - Historical performance (e.g., delivery speed, customer feedback)
    // - Rider preferences (e.g., preferred delivery areas or times)
    // - Dynamic factors (e.g., current traffic conditions, weather)
    // - Integration with external systems for real-time data
    // - Machine learning algorithms to predict best rider for a given order
    // - Feedback loop to continuously improve the matching algorithm based on outcomes
    return activeStatuses[0].userId;
  }
}
