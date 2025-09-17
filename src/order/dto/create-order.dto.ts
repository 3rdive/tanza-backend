import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
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

export class CreateOrderDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PartyInfoDto)
  sender: PartyInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartyInfoDto)
  recipient: PartyInfoDto;

  @IsString()
  @IsNotEmpty()
  pickUpLocation: string;

  @IsString()
  @IsNotEmpty()
  dropOffLocation: string;

  @IsNotEmpty()
  @IsEnum(UserOrderRole)
  userOrderRole: UserOrderRole;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsString()
  @IsOptional()
  noteForRider?: string;
}
