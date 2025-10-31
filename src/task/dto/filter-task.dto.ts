import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TaskCategory } from '../task-category.enum';
import { TaskStatus } from '../task-status.enum';
import { PaginationDto } from '../../commons/pagination.dto';

export class FilterTaskDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
