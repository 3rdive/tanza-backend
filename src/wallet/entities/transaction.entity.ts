import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { User } from '../../users/user.entity';
import { TransactionStatus } from '../dto/transaction-status';
import { TransactionType } from './transaction-type.enum';
import { Wallets } from './wallet.entity';

@Entity()
export class Transactions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @ManyToOne(() => Wallets, (wallet) => wallet.transactions)
  wallet: Wallets;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions)
  user: User;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column()
  reference: string;

  @Column({ nullable: true }) //for bank transfer
  orderId: string;

  @ManyToOne(() => Order, (order) => order.transactions, { nullable: true })
  order: Order;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  status: TransactionStatus;
}
