import { TransactionDto } from '../dto/transaction-dto';
import { Transactions } from '../entities/transaction.entity';
import { TransactionDetailDto } from '../dto/transaction-detail.dto';
import { OrderMapper } from '../../order/mappers/order.mapper';

export class TransactionMapper {
  public static toEntity(dto: TransactionDto): Transactions {
    const transaction = new Transactions();

    transaction.walletId = dto.walletId;
    transaction.userId = dto.userId;
    transaction.amount = dto.amount;
    transaction.orderId = dto.orderId;
    transaction.type = dto.type;
    transaction.status = dto.status;
    transaction.isCashPayment = dto.isCashPayment;
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

  public static toTransactionDetailDto(
    entity: Transactions,
  ): TransactionDetailDto {
    const dto = new TransactionDetailDto();

    dto.id = entity.id;
    dto.walletId = entity.walletId;
    dto.userId = entity.userId;
    dto.amount = entity.amount;
    dto.reference = entity.reference;
    dto.orderId = entity.orderId;
    dto.type = entity.type;
    dto.description = entity.description;
    dto.isCashPayment = entity.isCashPayment;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.status = entity.status;

    if (entity.order) {
      dto.order = OrderMapper.toOrderDetailsDto(entity.order);
    }

    return dto;
  }
}
