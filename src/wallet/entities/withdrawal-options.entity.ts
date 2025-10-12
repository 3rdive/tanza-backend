import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class WithdrawalOptions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  riderId: string;

  @Column()
  bankName: string;

  @Column()
  accountNumber: string;

  @Column()
  bankHoldersName: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
