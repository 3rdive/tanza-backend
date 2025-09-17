import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import { PaginationService } from '../../commons/pagination.service';
import { StandardResponse } from '../../commons/standard-response';
import { TransactionDto } from '../dto/transaction-dto';
import { TransactionPaginationDto } from '../dto/transaction-pagination.dto';
import { Transactions } from '../entities/transaction.entity';
import { WalletMapper } from './wallet-mapper';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionRepository: Repository<Transactions>,
  ) {}

  createTransaction(transactionDto: TransactionDto) {
    return this.transactionRepository.save(transactionDto);
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
    const { data: transactions, pagination } =
      await PaginationService.findWithPagination<Transactions>({
        repository: this.transactionRepository,
        paginationDto: { limit: paginationDto.limit, page: paginationDto.page },
        where: { userId, type: paginationDto.transactionType },
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
}
