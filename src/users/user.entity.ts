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
import { Role } from '../auth/roles.enum';
import { Order } from '../order/entities/order.entity';
import { Transactions } from '../wallet/entities/transaction.entity';
import { Wallets } from '../wallet/entities/wallet.entity';
import { RegMode } from './reg-mode.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: false, unique: true })
  mobile: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ nullable: true })
  profilePic: string;

  @Column()
  countryCode: string;

  @CreateDateColumn()
  registrationDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Transactions, (transaction) => transaction.user)
  transactions: Transactions[];

  @Column({ nullable: true })
  walletId: string;

  @OneToOne(() => Wallets)
  @JoinColumn()
  wallet: Wallets;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @Column({ type: 'enum', enum: RegMode, default: RegMode.MANUAL })
  registrationMode: RegMode;

  @Column({ type: 'timestamptz', nullable: true })
  lastEmailUpdate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMobileUpdate: Date | null;
}
