import { TransactionDto } from '../dto/transaction-dto';
import { Transactions } from '../entities/transaction.entity';

export class TransactionMapper {
  public static toEntity(dto: TransactionDto): Transactions {
    const transaction = new Transactions();

    transaction.walletId = dto.walletId;
    transaction.userId = dto.userId;
    transaction.amount = dto.amount;
    transaction.orderId = dto.orderId;
    transaction.type = dto.type;
    transaction.status = dto.status;
    transaction.description = dto.description || '';
    transaction.reference = dto.reference;

    return transaction;
  }

  public static toDto(entity: Transactions): TransactionDto {
    const dto = new TransactionDto();

    dto.walletId = entity.walletId;
    dto.userId = entity.userId;
    dto.amount = entity.amount;
    dto.orderId = entity.orderId;
    dto.type = entity.type;
    dto.status = entity.status;
    dto.description = entity.description;
    dto.reference = entity.reference;

    return dto;
  }
}
