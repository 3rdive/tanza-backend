import { IsEnum, IsString, IsUUID } from 'class-validator';
import { TaskCategory } from '../task-category.enum';

export class CreateTaskDto {
  @IsEnum(TaskCategory)
  category: TaskCategory;

  @IsString()
  @IsUUID()
  userId: string;

  @IsString()
  reference: string;
}
