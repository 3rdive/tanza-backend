import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderLocation } from '../dto/order-location';
import { UserInfo } from './user-info';
import { DecimalToNumberTransformer } from '../../common/transformers/decimal.transformer';

@Entity()
export class DeliveryDestination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.deliveryDestinations)
  order: Order;

  @Column({ type: 'jsonb' })
  dropOffLocation: OrderLocation;

  @Column({ type: 'jsonb' })
  recipient: UserInfo;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    transformer: new DecimalToNumberTransformer(),
  })
  distanceFromPickupKm: number;

  @Column()
  durationFromPickup: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalToNumberTransformer(),
  })
  deliveryFee: number;

  @Column({ default: false })
  delivered: boolean;

  @Column({ nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
