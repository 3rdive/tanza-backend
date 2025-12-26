import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsDefined,
  IsNumber,
  ValidateIf,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserOrderRole } from '../entities/user-order-role.enum';
import { Column } from 'typeorm';

class PartyInfoDto {
  @IsString()
  @IsOptional()
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

  @ValidateIf((o) => o.isUrgent === true)
  @IsDefined({ message: 'urgencyFee is required when isUrgent is true' })
  @IsNumber({}, { message: 'urgencyFee must be a number' })
  @Type(() => Number)
  urgencyFee?: number;

  @IsOptional()
  @IsBoolean()
  isCashPayment?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'cashAmountToReceive must be a number' })
  @Type(() => Number)
  cashAmountToReceive?: number;
  //https://api.delivery.herlay.com/webhooks/paystack
  //
}
