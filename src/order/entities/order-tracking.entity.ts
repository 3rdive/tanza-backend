import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { TrackingStatus } from './tracking-status.enum';

@Entity()
@Unique(['orderId', 'status'])
export class OrderTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TrackingStatus,
    default: TrackingStatus.PENDING,
  })
  status: TrackingStatus;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.orderTracking, {
    onDelete: 'CASCADE',
  })
  order: Order;
}
