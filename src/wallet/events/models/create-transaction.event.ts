import { TransactionDto } from '../../dto/transaction-dto';

export class CreateTransactionEvent {
  constructor(public transactionDto: TransactionDto) {}
}
