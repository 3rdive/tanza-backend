import { TransactionType } from '../entities/transaction-type.enum';
import { TransactionStatus } from './transaction-status';

export class TransactionDto {
  walletId: string;
  userId: string;
  amount: number;
  orderId: string;
  type: TransactionType;
  status: TransactionStatus;
  isCashPayment: boolean;
  description?: string;
  reference: string;
}
