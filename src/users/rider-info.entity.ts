import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleType } from '../order/entities/vehicle-type.enum';
import { DocumentStatus } from './document-status.enum';
import { User } from './user.entity';

@Entity()
export class RiderInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: VehicleType, nullable: true })
  vehicleType: VehicleType;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.INITIAL,
  })
  documentStatus: DocumentStatus;

  @Column({ nullable: true })
  vehiclePhoto: string;

  @Column({ nullable: true })
  driverLicense: string;

  @Column({ type: 'jsonb', nullable: true })
  vehiclePapers: string[];

  @Column({ nullable: true })
  rejectionReason: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.riderInfo)
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
