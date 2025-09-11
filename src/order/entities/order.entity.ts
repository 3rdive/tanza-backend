import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Transactions } from '../../wallet/entities/transaction.entity';
import { UserInfo } from './user-info';
import { UserOrderRole } from './user-order-role.enum';
import { VehicleType } from './vehicle-type.enum';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToMany(() => Transactions, (transaction) => transaction.order)
  transactions: Transactions[];

  @Column({ type: 'jsonb', nullable: true })
  sender: UserInfo;

  @Column({ type: 'jsonb', nullable: true })
  recipient: UserInfo;

  @Column({ type: 'jsonb', nullable: true })
  pickUpLocation: string;

  @Column()
  dropOffLocation: string;

  @Column({ type: 'enum', enum: UserOrderRole })
  userOrderRole: UserOrderRole;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column({ nullable: true })
  noteForRider: string;

  @Column()
  serviceChargeAmount: number;

  @Column()
  eta: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @Column()
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
