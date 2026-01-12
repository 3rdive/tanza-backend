import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleType } from '../../vehicle-type/entities/vehicle-type.entity';

@Entity()
export class VehicleDocumentSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  vehicleTypeId: string;

  @ManyToOne(() => VehicleType)
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
