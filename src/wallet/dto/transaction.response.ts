import { TransactionType } from '../entities/transaction-type.enum';
import { TransactionStatus } from './transaction-status';
import { TrackingStatus } from '../../order/entities/tracking-status.enum';

export class TransactionResponse {
  id: string;
  amount: number;
  type: TransactionType;
  createdAt: Date;
  orderId: string | null;
  description: string;
  status: TransactionStatus;
  isCashPayment: boolean;
  // Last order tracking status when type is ORDER; otherwise null
  orderStatus?: TrackingStatus | null;
}
