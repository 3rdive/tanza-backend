import { DocumentStatus } from '../document-status.enum';

export class RiderDocumentDto {
  id: string;
  docName: string;
  docUrl: string;
  documentStatus: DocumentStatus;
  expirationDate: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class RiderInfoDto {
  id: string;
  userId: string;
  vehicleType: string | null;
  documentStatus: DocumentStatus;
  rejectionReason?: string;
  documents?: RiderDocumentDto[];
  createdAt: Date;
  updatedAt: Date;
  userName: string;
}
