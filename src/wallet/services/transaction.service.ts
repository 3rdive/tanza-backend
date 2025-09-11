import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../commons/pagination.dto';
import { PaginationService } from '../../commons/pagination.service';
import { StandardResponse } from '../../commons/standard-response';
import { TransactionDto } from '../dto/transaction-dto';
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

  async fetchTransactions(userId: string, paginationDto: PaginationDto) {
    const { data: transactions, pagination } =
      await PaginationService.findWithPagination<Transactions>({
        repository: this.transactionRepository,
        paginationDto,
        where: { userId },
      });

    return StandardResponse.withPagination(
      WalletMapper.mapListToTransactionResponse(transactions),
      'Transactions fetched successfully',
      pagination,
    );
  }

  async findById(userId: string, idOrReference: string) {
    // TODO: map transaction with the order attached to it
    const transaction = await this.transactionRepository.find({
      where: [{ id: idOrReference }, { reference: idOrReference }],
      relations: ['order', 'user'],
    });

    return transaction;
  }
}
