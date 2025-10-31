import { IsOptional } from 'class-validator';
import { PaginationDto } from '../../commons/pagination.dto';

export class NotificationPaginationDto extends PaginationDto {
  @IsOptional()
  userId?: string;
}
