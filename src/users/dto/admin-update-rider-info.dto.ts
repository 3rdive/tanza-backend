import { IsEnum, IsNotEmpty, ValidateIf } from 'class-validator';
import { DocumentStatus } from '../document-status.enum';

export class AdminUpdateRiderInfoDto {
  @IsNotEmpty()
  riderInfoId: string;

  @IsNotEmpty()
  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @ValidateIf((o) => o.status === DocumentStatus.REJECTED)
  @IsNotEmpty({
    message: 'Rejection reason is required when status is REJECTED',
  })
  rejectionReason?: string;
}
