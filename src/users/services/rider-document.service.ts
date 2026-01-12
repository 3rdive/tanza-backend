import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentStatus } from '../document-status.enum';
import {
  UpdateDocumentStatusDto,
  UploadRiderDocumentDto,
} from '../dto/rider-document.dto';
import { RiderDocument } from '../entities/rider-document.entity';
import { RiderInfo } from '../rider-info.entity';
import { VehicleDocumentSettingsService } from './vehicle-document-settings.service';
import { VehicleType } from '../../vehicle-type/entities/vehicle-type.entity';

@Injectable()
export class RiderDocumentService {
  constructor(
    @InjectRepository(RiderDocument)
    private readonly documentRepository: Repository<RiderDocument>,
    @InjectRepository(RiderInfo)
    private readonly riderInfoRepository: Repository<RiderInfo>,
    private readonly settingsService: VehicleDocumentSettingsService,
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
  ) {}

  /**
   rider first updates his vehicle Type
   rider then move further to upload documents (document status is set to pending)
   */

  // async uploadDocument(
  //   userId: string,
  //   dto: UploadRiderDocumentDto,
  // ): Promise<RiderDocument> {
  //   // Get rider info
  //   const riderInfo = await this.riderInfoRepository.findOne({
  //     where: { userId },
  //   });

  //   const riderInfoId = riderInfo!.id;

  //   if (!riderInfo) {
  //     throw new NotFoundException('Rider info not found');
  //   }

  //   if (!riderInfo.vehicleType) {
  //     throw new BadRequestException('Vehicle type not set for rider');
  //   }

  //   // Validate document against settings
  //   const settings = await this.settingsService.findByVehicleType(
  //     riderInfo.vehicleType,
  //   );
  //   const requiredDoc = settings.find((s) => s.docName === dto.docName);

  //   if (!requiredDoc) {
  //     throw new BadRequestException(
  //       `Document '${dto.docName}' is not required for vehicle type '${riderInfo.vehicleType}'`,
  //     );
  //   }

  //   // Check if expiration date is required but not provided
  //   if (requiredDoc.requiresExpiration && !dto.expirationDate) {
  //     throw new BadRequestException(
  //       `Expiration date is required for document '${dto.docName}'`,
  //     );
  //   }

  //   // Check if document already exists
  //   const existingDoc = await this.documentRepository.findOne({
  //     where: { riderInfoId, docName: dto.docName },
  //   });

  //   if (existingDoc) {
  //     // Update existing document
  //     existingDoc.docUrl = dto.docUrl;
  //     if (dto.expirationDate) {
  //       existingDoc.expirationDate = new Date(dto.expirationDate);
  //     }
  //     existingDoc.documentStatus = DocumentStatus.PENDING;
  //     const updatedDoc = await this.documentRepository.save(existingDoc);

  //     // Update rider info overall status
  //     await this.updateRiderInfoStatus(riderInfoId);

  //     return updatedDoc;
  //   }

  //   // Create new document
  //   const document = this.documentRepository.create({
  //     riderInfoId,
  //     docName: dto.docName,
  //     docUrl: dto.docUrl,
  //     documentStatus: DocumentStatus.PENDING,
  //   });

  //   if (dto.expirationDate) {
  //     document.expirationDate = new Date(dto.expirationDate);
  //   }

  //   const savedDoc = await this.documentRepository.save(document);

  //   // Update rider info overall status
  //   await this.updateRiderInfoStatus(riderInfoId);

  //   return savedDoc;
  // }

  async getDocumentsByRiderInfo(riderInfoId: string): Promise<RiderDocument[]> {
    return await this.documentRepository.find({
      where: { riderInfoId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateDocumentStatus(
    documentId: string,
    dto: UpdateDocumentStatusDto,
  ): Promise<RiderDocument> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    document.documentStatus = dto.documentStatus;
    if (
      document.documentStatus === DocumentStatus.REJECTED &&
      dto.rejectionReason
    ) {
      document.rejectionReason = dto.rejectionReason;
    } else {
      document.rejectionReason = '';
    }

    const updatedDoc = await this.documentRepository.save(document);

    await this.updateRiderInfoStatus(document.riderInfoId);
    return updatedDoc;
  }

  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const riderInfoId = document.riderInfoId;
    await this.documentRepository.remove(document);

    // Update rider info overall status
    await this.updateRiderInfoStatus(riderInfoId);
  }

  /**
   
  By default when a rider registers we set the RiderInfo documentStatus to INITIAL.
  Whenever a document is uploaded or updated, we set the RiderInfo documentStatus to PENDING.
  This indicates that the rider has submitted documents for review.

  APPROVAL & REJECTION
  ===================
  If the admin approves all documents, the RiderInfo documentStatus should be set to APPROVED.
  If any document is rejected, the RiderInfo documentStatus should be set to REJECTED.

  This method is called after document uploads, updates, or deletions to ensure the overall
  RiderInfo documentStatus reflects the current state of all associated RiderDocuments.

   */

  private async updateRiderInfoStatus(riderInfoId: string): Promise<void> {
    const riderInfo = await this.riderInfoRepository.findOne({
      where: { id: riderInfoId },
      relations: ['documents'],
    });

    if (!riderInfo) {
      return;
    }

    if (riderInfo.documents.length === 0) {
      // for any reason all documents were deleted
      riderInfo.documentStatus = DocumentStatus.INITIAL;
    } else if (
      riderInfo.documents.some(
        (doc) => doc.documentStatus === DocumentStatus.REJECTED,
      )
    ) {
      riderInfo.documentStatus = DocumentStatus.REJECTED;
      riderInfo.rejectionReason = riderInfo.documents
        .filter((doc) => doc.documentStatus === DocumentStatus.REJECTED)
        .map((doc) => `${doc.docName}: ${doc.rejectionReason}`)
        .join('; ');
    } else if (
      riderInfo.documents.every(
        (doc) => doc.documentStatus === DocumentStatus.APPROVED,
      )
    ) {
      riderInfo.documentStatus = DocumentStatus.APPROVED;
    } else {
      //probably has at least one PENDING or INITIAL
      riderInfo.documentStatus = DocumentStatus.PENDING;
    }
    await this.riderInfoRepository.save(riderInfo);
  }

  async getRequiredDocuments(vehicleTypeIdentifier: string) {
    let vehicleTypeId = vehicleTypeIdentifier;

    // Check if it's a UUID
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        vehicleTypeIdentifier,
      );

    if (!isUuid) {
      const vehicleType = await this.vehicleTypeRepository.findOne({
        where: { name: vehicleTypeIdentifier },
      });
      if (!vehicleType) {
        throw new NotFoundException(
          `Vehicle type '${vehicleTypeIdentifier}' not found`,
        );
      }
      vehicleTypeId = vehicleType.id;
    }

    const settings =
      await this.settingsService.findByVehicleTypeId(vehicleTypeId);

    return settings.map((setting) => {
      return {
        docName: setting.docName,
        requiresExpiration: setting.requiresExpiration,
        isRequired: setting.isRequired,
        vehicleType: setting.vehicleType?.name || null,
      };
    });
  }

  async uploadMultipleDocuments(
    userId: string,
    documents: UploadRiderDocumentDto[],
  ): Promise<RiderDocument[]> {
    // Get rider info once
    const riderInfo = await this.riderInfoRepository.findOne({
      where: { userId },
    });

    if (!riderInfo) {
      throw new NotFoundException('Rider info not found');
    }

    if (!riderInfo.vehicleTypeId) {
      throw new BadRequestException('Vehicle type not set for rider');
    }
    const riderInfoId = riderInfo.id;

    // Get settings once
    const settings = await this.settingsService.findByVehicleTypeId(
      riderInfo.vehicleTypeId,
    );

    // Check if all required documents are present
    const requiredDocNames = settings
      .filter((s) => s.isRequired)
      .map((s) => s.docName);
    const providedDocNames = documents.map((d) => d.docName);

    for (const requiredDocName of requiredDocNames) {
      if (!providedDocNames.includes(requiredDocName)) {
        throw new BadRequestException(
          `Required document '${requiredDocName}' is missing`,
        );
      }
    }

    // Validate all documents
    for (const dto of documents) {
      const requiredDoc = settings.find((s) => s.docName === dto.docName);

      if (!requiredDoc) {
        throw new BadRequestException(
          `Document '${dto.docName}' is not required for vehicle type`,
        );
      }

      // Check if expiration date is required but not provided
      if (requiredDoc.requiresExpiration && !dto.expirationDate) {
        throw new BadRequestException(
          `Expiration date is required for document '${dto.docName}'`,
        );
      }
    }

    // Process each document (all validations passed)
    const uploaded: RiderDocument[] = [];
    for (const dto of documents) {
      // Check if document already exists
      const existingDoc = await this.documentRepository.findOne({
        where: { riderInfoId, docName: dto.docName },
      });

      if (existingDoc) {
        // Update existing document only if something changed
        let hasChanges = false;

        if (existingDoc.docUrl !== dto.docUrl) {
          existingDoc.docUrl = dto.docUrl;
          hasChanges = true;
        }

        if (dto.expirationDate) {
          const newExpirationDate = new Date(dto.expirationDate);
          const existingDate = existingDoc.expirationDate
            ? new Date(existingDoc.expirationDate)
            : null;

          if (
            !existingDate ||
            existingDate.getTime() !== newExpirationDate.getTime()
          ) {
            existingDoc.expirationDate = newExpirationDate;
            hasChanges = true;
          }
        }

        if (existingDoc.documentStatus !== DocumentStatus.PENDING) {
          existingDoc.documentStatus = DocumentStatus.PENDING;
          hasChanges = true;
        }

        if (hasChanges) {
          const updatedDoc = await this.documentRepository.save(existingDoc);
          uploaded.push(updatedDoc);
        } else {
          uploaded.push(existingDoc);
        }
      } else {
        // Create new document
        const document = this.documentRepository.create({
          riderInfoId,
          docName: dto.docName,
          docUrl: dto.docUrl,
          documentStatus: DocumentStatus.PENDING,
        });

        if (dto.expirationDate) {
          document.expirationDate = new Date(dto.expirationDate);
        }

        const savedDoc = await this.documentRepository.save(document);
        uploaded.push(savedDoc);
      }
    }

    // Update rider info overall status after processing all documents
    await this.updateRiderInfoStatus(riderInfoId);

    return uploaded;
  }
}
