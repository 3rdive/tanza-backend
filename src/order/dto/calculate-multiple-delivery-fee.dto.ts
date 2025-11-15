import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';

export class CalculateMultipleDeliveryFeeDto {
  @IsArray()
  @ArrayMinSize(2)
  pickupLocation: [number, number];

  @IsArray()
  @ArrayMinSize(1)
  deliveryLocations: [number, number][];

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean = false;

  @IsNumber()
  urgencyFee: number;
}
