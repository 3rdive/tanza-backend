import { IsEnum, IsOptional, IsISO8601 } from 'class-validator';
import { PaginationDto } from '../../commons/pagination.dto';
import { TransactionType } from '../entities/transaction-type.enum';

export class TransactionPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
