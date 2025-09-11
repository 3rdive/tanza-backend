import { TransactionType } from '../entities/transaction-type.enum';
import { TransactionStatus } from './transaction-status';

export class TransactionResponse {
  id: string;
  amount: number;
  type: TransactionType;
  createdAt: Date;
  orderId: string | null;
  description: string;
  status: TransactionStatus;
}
