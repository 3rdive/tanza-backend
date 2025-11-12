import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentStatus } from '../document-status.enum';
import { RiderInfo } from '../rider-info.entity';

@Entity()
export class RiderDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  docName: string;

  @Column()
  docUrl: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  documentStatus: DocumentStatus;

  @Column({ type: 'date', nullable: true })
  expirationDate: Date;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column()
  riderInfoId: string;

  @ManyToOne(() => RiderInfo, (riderInfo) => riderInfo.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  riderInfo: RiderInfo;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
