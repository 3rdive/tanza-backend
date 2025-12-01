import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Unique(['riderId', 'accountNumber', 'bankName'])
export class WithdrawalOptions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  riderId: string;

  @Column()
  bankName: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ nullable: true })
  bankCode: string;

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
