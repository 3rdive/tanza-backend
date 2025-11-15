import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserOrderRole } from '../entities/user-order-role.enum';
import { VehicleType } from '../entities/vehicle-type.enum';

class PartyInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

class DeliveryLocationDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsArray()
  @ArrayMinSize(2)
  coordinates: [number, number]; // [longitude, latitude]

  @ValidateNested()
  @Type(() => PartyInfoDto)
  recipient: PartyInfoDto;
}

export class CreateMultipleDeliveryOrderDto {
  @ValidateNested()
  @Type(() => PartyInfoDto)
  sender: PartyInfoDto;

  @IsString()
  @IsNotEmpty()
  pickUpAddress: string;

  @IsArray()
  @ArrayMinSize(2)
  pickUpCoordinates: [number, number]; // [longitude, latitude]

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryLocationDto)
  deliveryLocations: DeliveryLocationDto[];

  @IsNotEmpty()
  @IsEnum(UserOrderRole)
  userOrderRole: UserOrderRole;

  @IsString()
  @IsOptional()
  noteForRider?: string;

  @IsOptional()
  isUrgent?: boolean;
}
