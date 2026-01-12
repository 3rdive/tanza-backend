import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import { StandardResponse } from '../../commons/standard-response';
import { TransactionDto } from '../dto/transaction-dto';
import { TransactionPaginationDto } from '../dto/transaction-pagination.dto';
import { Transactions } from '../entities/transaction.entity';
import { WalletMapper } from './wallet-mapper';
import { TransactionMapper } from '../mappers/transaction.mapper';
import { TransactionType } from '../entities/transaction-type.enum';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionRepository: Repository<Transactions>,
  ) {}

  createTransaction(transactionDto: TransactionDto) {
    const transaction = TransactionMapper.toEntity(transactionDto);
    return this.transactionRepository.save(transaction);
  }

  checkExistingTransaction(userId: string, reference: string) {
    return this.transactionRepository.exists({
      where: { userId, reference },
    });
  }

  async fetchTransactions(
    userId: string,
    paginationDto: TransactionPaginationDto,
  ) {
    const {
      limit = 10,
      page = 1,
      transactionType,
      startDate,
      endDate,
    } = paginationDto;

    // Base query for count and data
    const baseQb = this.transactionRepository
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId });

    if (transactionType) {
      baseQb.andWhere('t.type = :type', { type: transactionType });
    }

    if (startDate) {
      baseQb.andWhere('t.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      baseQb.andWhere('t.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    // Total count without pagination
    const total = await baseQb.getCount();

    // Data query with computed latest order status when type is ORDER
    const dataQb = baseQb.clone();

    const latestStatusSubquery = dataQb
      .subQuery()
      .select('ot.status')
      .from('order_tracking', 'ot')
      .where('ot."orderId" = t.orderId')
      .orderBy('ot."createdAt"', 'DESC')
      .limit(1)
      .getQuery();

    dataQb
      .addSelect(
        `CASE WHEN t.type = :orderType THEN (${latestStatusSubquery}) ELSE NULL END`,
        'orderStatus',
      )
      .setParameter('orderType', TransactionType.ORDER)
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const { raw, entities } = await dataQb.getRawAndEntities();

    // Attach computed orderStatus to the corresponding entities for mapping
    entities.forEach((entity, index) => {
      (entity as any).orderStatus = raw[index]?.orderStatus ?? null;
    });

    return StandardResponse.withPagination(
      WalletMapper.mapListToTransactionResponse(entities),
      'Transactions fetched successfully',
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    );
  }

  async findById(userId: string, idOrReference: string) {
    // TODO: map transaction with the order attached to it
    const useUUID = isUUID(idOrReference);

    const transaction = await this.transactionRepository.findOne({
      where: useUUID ? { id: idOrReference } : { reference: idOrReference },
      relations: [
        'order',
        'order.vehicleType',
        'order.orderTracking',
        'order.deliveryDestinations',
      ],
    });

    if (!transaction) {
      return null;
    }

    return TransactionMapper.toTransactionDetailDto(transaction);
  }

  async getTotalEarnings(userId: string): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.amount), 0)', 'total')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: 'complete' })
      .andWhere('transaction.type = :type', { type: 'ORDER_REWARD' })
      .getRawOne();

    return Number(result?.total) || 0;
  }
}
