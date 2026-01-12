import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVehicleTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseFee?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxWeight?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
