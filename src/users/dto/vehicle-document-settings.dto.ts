import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateVehicleDocumentSettingDto {
  @IsUUID()
  @IsNotEmpty()
  vehicleTypeId: string;

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
