import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleType } from '../../order/entities/vehicle-type.enum';

@Entity()
export class VehicleDocumentSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column()
  docName: string;

  @Column({ default: false })
  requiresExpiration: boolean;

  @Column({ default: true })
  isRequired: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
