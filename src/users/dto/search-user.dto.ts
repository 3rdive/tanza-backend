import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../commons/pagination.dto';

export class SearchUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  query?: string;
}
