import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Index(['reviewerId', 'targetUserId'], { unique: true })
export class UserRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  reviewerId: string; // User who gives the rating

  @Column({ nullable: true })
  targetUserId: string; // User who receives the rating

  @Column({ type: 'int', nullable: true })
  starRating: number; // 1 - 5

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
