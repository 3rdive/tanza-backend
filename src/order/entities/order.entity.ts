import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Transactions } from '../../wallet/entities/transaction.entity';
import { OrderTracking } from './order-tracking.entity';
import { UserInfo } from './user-info';
import { UserOrderRole } from './user-order-role.enum';
import { VehicleType } from './vehicle-type.enum';
import { OrderLocation } from '../dto/order-location';
import { DecimalToNumberTransformer } from '../../common/transformers/decimal.transformer';

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
  pickUpLocation: OrderLocation;

  @Column({ type: 'jsonb', nullable: true })
  dropOffLocation: OrderLocation;

  @Column({ type: 'enum', enum: UserOrderRole })
  userOrderRole: UserOrderRole;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column({ nullable: true })
  noteForRider: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalToNumberTransformer(),
  })
  serviceChargeAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalToNumberTransformer(),
  })
  deliveryFee: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: new DecimalToNumberTransformer(),
  })
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

  @Column({ nullable: true })
  riderId: string;

  @ManyToOne(() => User, (user) => user.riderOrders)
  rider: User;

  @Column({ default: false })
  riderAssigned: boolean;

  @Column({ nullable: true })
  riderAssignedAt: Date;

  @Column({ default: false })
  hasRewardedRider: boolean;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  declinedRiderIds: string[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    transformer: new DecimalToNumberTransformer(),
    nullable: true,
  })
  distanceInKm: number;

  @Column({ default: false })
  isUrgent: boolean;
}
