import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

/**
 * RiderService
 *
 * Changes in this file:
 * - Normalize pickupLocation inputs (handle both [lon, lat] and [lat, lon] and object shapes)
 * - Validate latitude/longitude inputs and reject invalid coordinates
 * - Add logging to help diagnose why a close-by rider may not be picked
 *
 * Notes:
 * - The public API for getRiderForOrder still accepts the same parameter types, but is more tolerant
 *   about the order of coordinates and will attempt to auto-detect and normalize them.
 */
@Injectable()
export class RiderService {
  private readonly logger = new Logger(RiderService.name);

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

  /**
   * getRiderForOrder
   *
   * - Accepts excludeRiderIds and an optional pickupLocation.
   * - pickupLocation may be:
   *    - [longitude, latitude] (preferred / legacy)
   *    - [latitude, longitude] (commonly provided accidentally by clients)
   *    - { latitude: number|string, longitude: number|string }
   *
   * This function will attempt to normalize and validate the pickupLocation.
   */
  async getRiderForOrder(
    excludeRiderIds: string[] = [],
    pickupLocation?:
      | [number, number]
      | { latitude: number | string; longitude: number | string },
  ): Promise<string | null> {
    const MAX_ACTIVE_ORDERS = 5;
    const SEARCH_RADIUS_KM = 100; // Search within 100km radius

    // Normalize and validate pickupLocation early, if provided
    let normalizedPickup: [number, number] | undefined = undefined; // [longitude, latitude]
    if (pickupLocation !== undefined) {
      try {
        normalizedPickup = this.normalizePickupLocation(pickupLocation);
      } catch (err) {
        // Re-throw as BadRequestException with StandardResponse format if validation fails
        this.logger.warn(`Invalid pickupLocation: ${(err as Error).message}`);
        throw new BadRequestException(
          StandardResponse.fail((err as Error).message),
        );
      }
      this.logger.debug(
        `Normalized pickup location to [lon, lat]: [${normalizedPickup[0]}, ${normalizedPickup[1]}]`,
      );
    }

    // Single optimized query joining all required tables and computing active order counts
    const query = this.activeStatusRepository
      .createQueryBuilder('activeStatus')
      .innerJoin('activeStatus.user', 'user')
      .innerJoin(
        'rider_info',
        'riderInfo',
        'riderInfo.userId = activeStatus.userId',
      )
      .leftJoin('order', 'order', 'order.riderId = activeStatus.userId')
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

    // If pickup location provided, use PostgreSQL bounding box for initial filtering
    if (normalizedPickup) {
      const [pickupLon, pickupLat] = normalizedPickup;
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
    let riders = await query
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

    this.logger.debug(
      `Found ${riders?.length ?? 0} candidate riders under max orders`,
    );

    // If no riders found under the max active orders threshold, retry without the threshold
    if (!riders || riders.length === 0) {
      this.logger.debug(
        'No riders under max active orders threshold, retrying including busy riders',
      );
      riders = await query
        .having(
          `COUNT(CASE
            WHEN latestTracking."latestStatus" NOT IN ('${TrackingStatus.DELIVERED}', '${TrackingStatus.CANCELLED}')
            THEN 1
          END) >= :maxOrders`,
          { maxOrders: MAX_ACTIVE_ORDERS },
        )
        .limit(100)
        .getRawMany();

      this.logger.debug(
        `Found ${riders?.length ?? 0} candidate riders with >= max orders`,
      );

      // If still no riders found, return null
      if (!riders || riders.length === 0) {
        this.logger.warn('No available riders found at all');
        return null;
      }
    }

    // If no pickup location provided, return first available rider
    if (!normalizedPickup) {
      this.logger.debug(
        `No pickup location provided, returning first candidate: ${riders[0].userId}`,
      );
      return riders[0].userId;
    }

    // Find closest rider among candidates (now only up to 100 candidates)
    const closest = this.findClosestRider(riders, normalizedPickup);
    if (!closest) {
      this.logger.warn('No closest rider could be determined from candidates');
      return null;
    }

    this.logger.debug(`Closest rider selected: ${closest}`);
    return closest;
  }

  /**
   * Normalize pickupLocation into [longitude, latitude]
   *
   * Accepts:
   * - [lon, lat]
   * - [lat, lon]
   * - { latitude, longitude }
   *
   * Detects swapped coordinates heuristically by checking value ranges and logs warnings when ambiguous.
   *
   * Throws an Error if values are not valid coordinates.
   */
  private normalizePickupLocation(
    pickupLocation:
      | [number, number]
      | { latitude: number | string; longitude: number | string },
  ): [number, number] {
    // Helper to parse numeric coordinate
    const parseCoord = (v: number | string): number => {
      if (v === null || v === undefined) {
        throw new Error('pickupLocation has null/undefined coordinate');
      }
      const n = typeof v === 'number' ? v : parseFloat(v);
      if (!isFinite(n)) {
        throw new Error(
          `pickupLocation coordinate is not a finite number: ${v}`,
        );
      }
      return n;
    };

    let lon: number;
    let lat: number;

    if (Array.isArray(pickupLocation)) {
      if (pickupLocation.length !== 2) {
        throw new Error('pickupLocation array must have exactly 2 elements');
      }
      const a = parseCoord(pickupLocation[0]);
      const b = parseCoord(pickupLocation[1]);

      // Heuristic detection:
      // - Valid latitude range: -90 .. 90
      // - Valid longitude range: -180 .. 180
      const aIsLat = a >= -90 && a <= 90;
      const aIsLon = a >= -180 && a <= 180;
      const bIsLat = b >= -90 && b <= 90;
      const bIsLon = b >= -180 && b <= 180;

      // If a looks like lon and b looks like lat => treat as [lon, lat]
      if (
        aIsLon &&
        bIsLat &&
        !(
          aIsLat &&
          bIsLon &&
          Math.abs(a) <= 90 &&
          Math.abs(b) <= 180 &&
          a !== b
        )
      ) {
        // Most likely [lon, lat]
        lon = a;
        lat = b;
      } else if (aIsLat && bIsLon && !(aIsLon && bIsLat)) {
        // Most likely [lat, lon] (swapped) => we swap to [lon, lat]
        lon = b;
        lat = a;
        this.logger.warn(
          `pickupLocation array appears to be [lat, lon]. Normalizing by swapping values. Original: [${a}, ${b}] => [lon=${lon}, lat=${lat}]`,
        );
      } else if (aIsLon && bIsLon && !aIsLat && !bIsLat) {
        // Both look like longitudes (rare). Treat second as lat if within lat range else fail.
        if (b >= -90 && b <= 90) {
          lon = a;
          lat = b;
        } else {
          throw new Error(
            'Ambiguous pickupLocation coordinates: unable to infer latitude/longitude',
          );
        }
      } else if (aIsLat && bIsLat && !aIsLon && !bIsLon) {
        // Both look like latitudes (rare). Treat second as lon if within lon range else fail.
        if (b >= -180 && b <= 180) {
          lon = b;
          lat = a;
        } else {
          throw new Error(
            'Ambiguous pickupLocation coordinates: unable to infer latitude/longitude',
          );
        }
      } else {
        // Fallback: assume incoming array is [lon, lat] (existing callers) but validate ranges
        lon = a;
        lat = b;
        this.logger.warn(
          `Ambiguous pickupLocation array received. Assuming [lon, lat]: [${lon}, ${lat}]`,
        );
      }
    } else {
      // Object shape
      const parsedLat = parseCoord(pickupLocation.latitude);
      const parsedLon = parseCoord(pickupLocation.longitude);
      lat = parsedLat;
      lon = parsedLon;
    }

    // Final validation: ensure lat/lon are in acceptable ranges
    if (!this.isValidLatitude(lat)) {
      throw new Error(
        `Invalid latitude value: ${lat}. Must be between -90 and 90.`,
      );
    }
    if (!this.isValidLongitude(lon)) {
      throw new Error(
        `Invalid longitude value: ${lon}. Must be between -180 and 180.`,
      );
    }

    return [lon, lat];
  }

  private isValidLatitude(lat: number): boolean {
    return isFinite(lat) && lat >= -90 && lat <= 90;
  }

  private isValidLongitude(lon: number): boolean {
    return isFinite(lon) && lon >= -180 && lon <= 180;
  }

  /**
   * Find closest rider from a list of candidates based on pickup location
   * Optimized to work with pre-filtered candidates
   *
   * candidates: array of raw results with fields userId, latitude, longitude
   * pickupLocation: normalized [longitude, latitude]
   */
  private findClosestRider(
    candidates: any[],
    pickupLocation: [number, number],
  ): string | null {
    let closestRider: { userId: string; distance: number } | null = null;
    const [pickupLon, pickupLat] = pickupLocation;

    for (const candidate of candidates) {
      const riderLat = parseFloat(String(candidate.latitude));
      const riderLon = parseFloat(String(candidate.longitude));

      if (!isFinite(riderLat) || !isFinite(riderLon)) {
        this.logger.warn(
          `Skipping candidate with invalid coordinates: ${JSON.stringify(candidate)}`,
        );
        continue;
      }

      // Calculate distance using Haversine formula (calculateDistance expects lat1, lon1, lat2, lon2)
      const distance = this.calculateDistance(
        pickupLat, // latitude
        pickupLon, // longitude
        riderLat,
        riderLon,
      );

      this.logger.debug(
        `Candidate ${candidate.userId} at [lon=${riderLon}, lat=${riderLat}] is ${distance.toFixed(3)} km from pickup`,
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
