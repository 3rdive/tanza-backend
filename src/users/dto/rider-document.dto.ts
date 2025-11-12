import { Type } from 'class-transformer';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  ValidateIf,
  IsArray,
  IsDateString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { DocumentStatus } from '../document-status.enum';

export class UploadRiderDocumentDto {
  @IsString()
  @IsNotEmpty()
  docName: string;

  @IsString()
  @IsNotEmpty()
  docUrl: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}

export class UploadMultipleDocumentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadRiderDocumentDto)
  documents: UploadRiderDocumentDto[];
}

export class UpdateDocumentStatusDto {
  @IsEnum(DocumentStatus)
  @IsNotEmpty()
  documentStatus: DocumentStatus;

  @ValidateIf((o) => o.documentStatus === DocumentStatus.REJECTED)
  @IsNotEmpty()
  @IsString()
  rejectionReason?: string;
}
