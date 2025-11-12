import { IsEnum, IsOptional } from 'class-validator';
import { VehicleType } from '../../order/entities/vehicle-type.enum';
import { DocumentStatus } from '../document-status.enum';

// Allowlist of statuses that users are permitted to set
export const USER_DOCUMENT_STATUS_ALLOWED: readonly DocumentStatus[] = [
  DocumentStatus.INITIAL,
  DocumentStatus.PENDING,
];

export class UpdateRiderInfoDto {
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  // Restrict to INITIAL & PENDING only
  @IsOptional()
  @IsEnum(USER_DOCUMENT_STATUS_ALLOWED, {
    message: 'documentStatus must be one of: INITIAL & PENDING',
  })
  documentStatus?: (typeof USER_DOCUMENT_STATUS_ALLOWED)[number];
}
