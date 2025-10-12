import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { VehicleType } from '../../order/entities/vehicle-type.enum';
import { DocumentStatus } from '../document-status.enum';

// Allowlist of statuses that users are permitted to set
export const USER_DOCUMENT_STATUS_ALLOWED: readonly DocumentStatus[] = [
  DocumentStatus.INITIAL,
  DocumentStatus.PENDING,
  DocumentStatus.SUBMITTED,
];

export class UpdateRiderInfoDto {
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  vehiclePhoto?: string;

  @IsOptional()
  @IsString()
  driverLicense?: string;

  @IsOptional()
  @IsArray()
  // allow empty array to clear papers
  vehiclePapers?: string[];

  // documentStatus is optional and should generally be set by admins/internal flows
  // Restrict to INITIAL, PENDING, SUBMITTED only
  @IsOptional()
  @IsEnum(USER_DOCUMENT_STATUS_ALLOWED, {
    message: 'documentStatus must be one of: INITIAL, PENDING, SUBMITTED',
  })
  documentStatus?: (typeof USER_DOCUMENT_STATUS_ALLOWED)[number];
}
