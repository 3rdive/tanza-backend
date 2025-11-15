import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../commons/pagination.dto';

export class SearchAddressBookDto extends PaginationDto {
  @IsOptional()
  @IsString()
  query?: string;
}
