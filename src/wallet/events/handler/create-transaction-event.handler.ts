import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TransactionService } from '../../services/transaction.service';
import { CreateTransactionEvent } from '../models/create-transaction.event';

@EventsHandler(CreateTransactionEvent)
export class CreateTransactionEventHandler
  implements IEventHandler<CreateTransactionEvent>
{
  constructor(private readonly transactionService: TransactionService) {}
  async handle(createTransactionEvent: CreateTransactionEvent) {
    await this.transactionService.createTransaction(
      createTransactionEvent.transactionDto,
    );
  }
}
