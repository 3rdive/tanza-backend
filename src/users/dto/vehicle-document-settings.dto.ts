import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { VehicleType } from '../../order/entities/vehicle-type.enum';

export class CreateVehicleDocumentSettingDto {
  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType: VehicleType;

  @IsString()
  @IsNotEmpty()
  docName: string;

  @IsBoolean()
  requiresExpiration: boolean;

  @IsBoolean()
  isRequired: boolean;
}

export class UpdateVehicleDocumentSettingDto {
  @IsString()
  @IsNotEmpty()
  docName?: string;

  @IsBoolean()
  requiresExpiration?: boolean;

  @IsBoolean()
  isRequired?: boolean;
}
