// pagination.dto.ts
import { IsNumber, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number) // Convert string from query to number
  limit?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  page?: number;
}
