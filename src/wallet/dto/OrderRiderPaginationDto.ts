import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { PaginationDto } from '../../commons/pagination.dto';
import { TrackingStatus } from '../../order/entities/tracking-status.enum';

export class OrderRiderPaginationDto extends PaginationDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsEnum(TrackingStatus, {
    each: true,
    message: 'Each value in orderStatus must be a valid TrackingStatus',
  })
  orderStatus?: TrackingStatus[];
}
