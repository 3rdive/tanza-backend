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
import { VehicleType } from '../order/entities/vehicle-type.enum';
import { DocumentStatus } from './document-status.enum';
import { RiderDocument } from './entities/rider-document.entity';
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
  rejectionReason: string;

  @OneToMany(() => RiderDocument, (document) => document.riderInfo, {
    cascade: true,
  })
  documents: RiderDocument[];

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
