import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OtpType } from './OtpTypes';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class OtpsEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  code: string;

  @Column()
  reference: string; //email or mobile

  @Column({ nullable: true }) // 30mins
  expiration: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ nullable: true })
  timeUsed: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  otpType: OtpType;

  @BeforeInsert()
  beforeInsert() {
    this.id = `otp_${uuidv4()}`;
  }
}
