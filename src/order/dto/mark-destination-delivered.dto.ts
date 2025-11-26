import { IsNotEmpty, IsString } from 'class-validator';

export class MarkDestinationDeliveredDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  destinationId: string;
}
