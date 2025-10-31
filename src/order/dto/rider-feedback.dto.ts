import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class RiderFeedbackDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsBoolean()
  @IsNotEmpty()
  accepted: boolean;
}
