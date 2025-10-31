import { Type, Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { VehicleType } from '../entities/vehicle-type.enum';

export class CalculateChargeQueryDto {
  @IsDefined()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  startLat!: number;

  @IsDefined()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  startLon!: number;

  @IsDefined()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  endLat!: number;

  @IsDefined()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  endLon!: number;

  @IsDefined()
  @IsNotEmpty()
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isUrgent?: boolean;
}
