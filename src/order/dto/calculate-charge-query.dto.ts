import { Type, Transform } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isUrgent?: boolean;

  @ValidateIf((o) => o.isUrgent === true)
  @IsDefined({ message: 'urgencyFee is required when isUrgent is true' })
  @IsNumber({}, { message: 'urgencyFee must be a number' })
  @Type(() => Number)
  urgencyFee?: number;
}
