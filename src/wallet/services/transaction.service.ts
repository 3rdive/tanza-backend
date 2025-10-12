import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { PaginationService } from '../../commons/pagination.service';
import { StandardResponse } from '../../commons/standard-response';
import { TransactionDto } from '../dto/transaction-dto';
import { TransactionPaginationDto } from '../dto/transaction-pagination.dto';
import { Transactions } from '../entities/transaction.entity';
import { WalletMapper } from './wallet-mapper';
import { TransactionMapper } from '../mappers/transaction.mapper';

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
    const where: any = { userId };
    if (paginationDto.transactionType) {
      where.type = paginationDto.transactionType;
    }
    // Add date filtering if provided
    if (paginationDto.startDate && paginationDto.endDate) {
      where.createdAt = Between(
        new Date(paginationDto.startDate),
        new Date(paginationDto.endDate),
      );
    } else if (paginationDto.startDate) {
      where.createdAt = MoreThanOrEqual(new Date(paginationDto.startDate));
    } else if (paginationDto.endDate) {
      where.createdAt = LessThanOrEqual(new Date(paginationDto.endDate));
    }

    const { data: transactions, pagination } =
      await PaginationService.findWithPagination<Transactions>({
        repository: this.transactionRepository,
        paginationDto: { limit: paginationDto.limit, page: paginationDto.page },
        where,
      });

    return StandardResponse.withPagination(
      WalletMapper.mapListToTransactionResponse(transactions),
      'Transactions fetched successfully',
      pagination,
    );
  }

  async findById(userId: string, idOrReference: string) {
    // TODO: map transaction with the order attached to it
    const useUUID = isUUID(idOrReference);

    return await this.transactionRepository.findOne({
      where: useUUID ? { id: idOrReference } : { reference: idOrReference },
      relations: ['order', 'order.orderTracking'],
    });
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
