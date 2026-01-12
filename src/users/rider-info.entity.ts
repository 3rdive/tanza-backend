import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleType } from '../vehicle-type/entities/vehicle-type.entity';
import { DocumentStatus } from './document-status.enum';
import { RiderDocument } from './entities/rider-document.entity';
import { User } from './user.entity';

@Entity()
export class RiderInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  vehicleTypeId: string;

  @ManyToOne(() => VehicleType)
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
