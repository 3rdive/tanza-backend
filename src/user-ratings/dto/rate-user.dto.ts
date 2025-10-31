import { IsUUID, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class RateUserDto {
  @IsUUID()
  targetUserId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  starRating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}
