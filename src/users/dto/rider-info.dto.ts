import { VehicleType } from '../../order/entities/vehicle-type.enum';
import { DocumentStatus } from '../document-status.enum';

export class RiderInfoDto {
  id: string;
  userId: string;
  vehicleType: VehicleType | null;
  vehiclePhoto: string | null;
  driverLicense: string | null;
  vehiclePapers: string[] | null;
  documentStatus: DocumentStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
