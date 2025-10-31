import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TrackingStatus } from '../entities/tracking-status.enum';

export class OrderTrackingDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  note: string;

  @IsEnum(TrackingStatus)
  @IsNotEmpty()
  status: TrackingStatus;
}
