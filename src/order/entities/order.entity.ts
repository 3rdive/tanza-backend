import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Transactions } from '../../wallet/entities/transaction.entity';
import { OrderTracking } from './order-tracking.entity';
import { UserInfo } from './user-info';
import { UserOrderRole } from './user-order-role.enum';
import { VehicleType } from './vehicle-type.enum';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Transactions, (transaction) => transaction.order)
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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  serviceChargeAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @OneToMany(() => OrderTracking, (orderTracking) => orderTracking.order)
  orderTracking: OrderTracking[];

  @Column()
  eta: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
