import { RiderInfo } from './rider-info.entity';
import { RiderInfoDto } from './dto/rider-info.dto';

export class RiderMapper {
  static toDto(entity: RiderInfo): RiderInfoDto {
    return {
      id: entity.id,
      userId: entity.userId,
      vehicleType: entity.vehicleType ?? null,
      vehiclePhoto: entity.vehiclePhoto ?? null,
      driverLicense: entity.driverLicense ?? null,
      vehiclePapers: entity.vehiclePapers ?? null,
      documentStatus: entity.documentStatus,
      rejectionReason: entity.rejectionReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
