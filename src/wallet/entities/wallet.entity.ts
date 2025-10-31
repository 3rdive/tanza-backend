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
import { DecimalToNumberTransformer } from '../../common/transformers/decimal.transformer';

@Entity()
export class Wallets {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.wallet)
  user: User;

  //DO NOT UPDATE without migration script
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, transformer: new DecimalToNumberTransformer() })
  walletBalance: number;

  @OneToMany(() => Transactions, (transaction) => transaction.wallet)
  transactions: Transactions[];

  @Column({ nullable: true })
  virtualAccountId: string;

  @OneToOne(() => VirtualAccount)
  @JoinColumn()
  virtualAccount: VirtualAccount;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  customerCode: string;

  @Column({ default: false })
  isFrozen: boolean;
}
