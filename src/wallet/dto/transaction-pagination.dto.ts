import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { PaginationDto } from '../../commons/pagination.dto';
import { TransactionType } from '../entities/transaction-type.enum';

export class TransactionPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType: TransactionType;
}
