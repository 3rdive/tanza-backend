import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wallets } from './wallet.entity';

@Entity()
export class VirtualAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  walletId: string;

  @OneToOne(() => Wallets, (wallet) => wallet.virtualAccount)
  wallet: Wallets;

  @Column()
  customerCode: string;

  @Column()
  accountNumber: string;

  @Column()
  bankName: string;

  @Column()
  accountName: string;
}
