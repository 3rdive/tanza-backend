import { IsEnum, IsNotEmpty } from 'class-validator';
import { TrackingStatus } from '../entities/tracking-status.enum';

export class OrderTrackingDto {
  @IsNotEmpty()
  orderId: string;

  @IsNotEmpty()
  note: string;

  @IsEnum(TrackingStatus)
  @IsNotEmpty()
  status: TrackingStatus;
}
