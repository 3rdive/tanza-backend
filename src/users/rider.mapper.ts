import { RiderInfo } from './rider-info.entity';
import { RiderInfoDto, RiderDocumentDto } from './dto/rider-info.dto';
import { RiderDocument } from './entities/rider-document.entity';

export class RiderMapper {
  static toDto(entity: RiderInfo, includeDocuments = false): RiderInfoDto {
    const dto: RiderInfoDto = {
      id: entity.id,
      userId: entity.userId,
      userName: `${entity.user?.firstName} ${entity.user?.lastName}`,
      vehicleType: entity.vehicleType?.name,
      documentStatus: entity.documentStatus,
      rejectionReason: entity.rejectionReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    if (includeDocuments && entity.documents) {
      dto.documents = entity.documents.map((doc) => this.documentToDto(doc));
    }

    return dto;
  }

  static documentToDto(entity: RiderDocument): RiderDocumentDto {
    return {
      id: entity.id,
      docName: entity.docName,
      docUrl: entity.docUrl,
      documentStatus: entity.documentStatus,
      expirationDate: entity.expirationDate,
      rejectionReason: entity.rejectionReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
