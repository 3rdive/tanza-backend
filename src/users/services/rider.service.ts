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
import { Order } from '../../order/entities/order.entity';
import { TrackingStatus } from '../../order/entities/tracking-status.enum';

@Injectable()
export class RiderService {
  constructor(
    private readonly activeStatusService: ActiveStatusService,
    @InjectRepository(RiderInfo)
    private readonly riderInfoRepository: Repository<RiderInfo>,
    @InjectRepository(ActiveStatus)
    private readonly activeStatusRepository: Repository<ActiveStatus>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
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
    pickupLocation?: [number, number], // [longitude, latitude]
  ): Promise<string | null> {
    const MAX_ACTIVE_ORDERS = 5;
    const SEARCH_RADIUS_KM = 50; // Search within 50km radius initially

    // Single optimized query joining all required tables and computing active order counts
    // This eliminates multiple round trips and N+1 queries
    const query = this.activeStatusRepository
      .createQueryBuilder('activeStatus')
      .innerJoin('activeStatus.user', 'user')
      .innerJoin(
        'rider_info',
        'riderInfo',
        'riderInfo.userId = activeStatus.userId',
      )
      .leftJoin(
        'order',
        'order',
        'order.riderId = activeStatus.userId AND order.riderAssigned = true',
      )
      .leftJoin(
        (qb) =>
          qb
            .select('ot."orderId"', 'orderId')
            .addSelect('ot.status', 'latestStatus')
            .from('order_tracking', 'ot')
            .innerJoin(
              (subQb) =>
                subQb
                  .select('ot2."orderId"', 'orderId')
                  .addSelect('MAX(ot2."createdAt")', 'maxCreatedAt')
                  .from('order_tracking', 'ot2')
                  .groupBy('ot2."orderId"'),
              'latest',
              'latest."orderId" = ot."orderId" AND latest."maxCreatedAt" = ot."createdAt"',
            ),
        'latestTracking',
        'latestTracking."orderId" = order.id',
      )
      .where('riderInfo.documentStatus = :approvedStatus', {
        approvedStatus: DocumentStatus.APPROVED,
      })
      .andWhere('activeStatus.status = :activeStatus', {
        activeStatus: 'active',
      })
      .andWhere('activeStatus.latitude IS NOT NULL')
      .andWhere('activeStatus.longitude IS NOT NULL');

    // Exclude riders who declined
    if (excludeRiderIds.length > 0) {
      query.andWhere('activeStatus.userId NOT IN (:...excludeRiderIds)', {
        excludeRiderIds,
      });
    }

    // If pickup location provided, use PostgreSQL's earth distance for spatial filtering
    // This uses bounding box approximation which is much faster than calculating exact distance for all riders
    if (pickupLocation) {
      const [pickupLon, pickupLat] = pickupLocation;
      // Approximate bounding box (1 degree ≈ 111km at equator)
      const latDelta = SEARCH_RADIUS_KM / 111.0;
      const lonDelta =
        SEARCH_RADIUS_KM / (111.0 * Math.cos(this.toRadians(pickupLat)));

      query
        .andWhere(
          'CAST(activeStatus.latitude AS DECIMAL) BETWEEN :minLat AND :maxLat',
          {
            minLat: pickupLat - latDelta,
            maxLat: pickupLat + latDelta,
          },
        )
        .andWhere(
          'CAST(activeStatus.longitude AS DECIMAL) BETWEEN :minLon AND :maxLon',
          {
            minLon: pickupLon - lonDelta,
            maxLon: pickupLon + lonDelta,
          },
        );
    }

    // Select fields and compute active order count in the same query
    const riders = await query
      .select('activeStatus.userId', 'userId')
      .addSelect('activeStatus.latitude', 'latitude')
      .addSelect('activeStatus.longitude', 'longitude')
      .addSelect(
        `COUNT(CASE 
          WHEN latestTracking."latestStatus" NOT IN ('${TrackingStatus.DELIVERED}', '${TrackingStatus.CANCELLED}')
          THEN 1 
        END)`,
        'activeOrderCount',
      )
      .groupBy('activeStatus.userId')
      .addGroupBy('activeStatus.latitude')
      .addGroupBy('activeStatus.longitude')
      .having(
        `COUNT(CASE 
          WHEN latestTracking."latestStatus" NOT IN ('${TrackingStatus.DELIVERED}', '${TrackingStatus.CANCELLED}')
          THEN 1 
        END) < :maxOrders`,
        { maxOrders: MAX_ACTIVE_ORDERS },
      )
      .limit(100) // Limit to top 100 candidates for distance calculation
      .getRawMany();

    if (riders.length === 0) {
      // No riders under limit found, try to find riders at/over limit as fallback
      const overLimitRiders = await query
        .select('activeStatus.userId', 'userId')
        .addSelect('activeStatus.latitude', 'latitude')
        .addSelect('activeStatus.longitude', 'longitude')
        .addSelect(
          `COUNT(CASE 
            WHEN latestTracking."latestStatus" NOT IN ('${TrackingStatus.DELIVERED}', '${TrackingStatus.CANCELLED}')
            THEN 1 
          END)`,
          'activeOrderCount',
        )
        .groupBy('activeStatus.userId')
        .addGroupBy('activeStatus.latitude')
        .addGroupBy('activeStatus.longitude')
        .having(
          `COUNT(CASE 
            WHEN latestTracking."latestStatus" NOT IN ('${TrackingStatus.DELIVERED}', '${TrackingStatus.CANCELLED}')
            THEN 1 
          END) >= :maxOrders`,
          { maxOrders: MAX_ACTIVE_ORDERS },
        )
        .limit(100)
        .getRawMany();

      if (overLimitRiders.length === 0) {
        return null;
      }

      // If no pickup location, return first available
      if (!pickupLocation) {
        return overLimitRiders[0].userId;
      }

      // Find closest among over-limit riders
      return this.findClosestRider(overLimitRiders, pickupLocation);
    }

    // If no pickup location provided, return first available rider
    if (!pickupLocation) {
      return riders[0].userId;
    }

    // Find closest rider among candidates (now only 100 max instead of all riders)
    return this.findClosestRider(riders, pickupLocation);
  }

  /**
   * Find closest rider from a list of candidates based on pickup location
   * Optimized to work with pre-filtered candidates
   */
  private findClosestRider(
    candidates: any[],
    pickupLocation: [number, number],
  ): string | null {
    let closestRider: { userId: string; distance: number } | null = null;

    for (const candidate of candidates) {
      const riderLat = parseFloat(String(candidate.latitude));
      const riderLon = parseFloat(String(candidate.longitude));

      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(
        pickupLocation[1], // latitude
        pickupLocation[0], // longitude
        riderLat,
        riderLon,
      );

      if (!closestRider || distance < closestRider.distance) {
        closestRider = { userId: candidate.userId, distance };
      }
    }

    return closestRider ? closestRider.userId : null;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
