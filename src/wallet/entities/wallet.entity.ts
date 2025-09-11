import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Transactions } from './transaction.entity';
import { VirtualAccount } from './virtual-account.entity';

@Entity()
export class Wallets {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.wallet)
  user: User;

  @Column({ default: 0 })
  walletBalance: number;

  @OneToMany(() => Transactions, (transaction) => transaction.wallet)
  transactions: Transactions[];

  @Column()
  virtualAccountId: string;

  @OneToOne(() => VirtualAccount)
  @JoinColumn()
  virtualAccount: VirtualAccount;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  customerCode: string;

  @Column({ default: false })
  isFrozen: boolean;
}
