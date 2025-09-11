import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
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

  @Column()
  amount: number;

  @Column()
  reference: string;

  @Column({ nullable: true }) //for bank transfer
  orderId: string;

  @ManyToMany(() => Order, (order) => order.transactions)
  @JoinColumn()
  order: Order;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column()
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  status: TransactionStatus;
}
