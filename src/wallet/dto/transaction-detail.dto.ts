import { OrderDetailsDto } from '../../order/dto/order-details.dto';
import { TransactionStatus } from './transaction-status';
import { TransactionType } from '../entities/transaction-type.enum';

export class TransactionDetailDto {
  id: string;
  walletId: string;
  userId: string;
  amount: number;
  reference: string;
  orderId: string;
  order?: OrderDetailsDto;
  type: TransactionType;
  description: string;
  isCashPayment: boolean;
  createdAt: Date;
  updatedAt: Date;
  status: TransactionStatus;
}
