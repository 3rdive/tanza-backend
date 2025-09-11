import { IsUUID, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class RateRiderDto {
  @IsUUID()
  riderId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
