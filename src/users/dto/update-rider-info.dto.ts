import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentStatus } from '../document-status.enum';

// Allowlist of statuses that users are permitted to set
export const USER_DOCUMENT_STATUS_ALLOWED: readonly DocumentStatus[] = [
  DocumentStatus.INITIAL,
  DocumentStatus.PENDING,
];

export class UpdateRiderInfoDto {
  @IsOptional()
  vehicleType?: string;

  // Restrict to INITIAL & PENDING only
  @IsOptional()
  @IsEnum(USER_DOCUMENT_STATUS_ALLOWED, {
    message: 'documentStatus must be one of: INITIAL & PENDING',
  })
  documentStatus?: (typeof USER_DOCUMENT_STATUS_ALLOWED)[number];
}
