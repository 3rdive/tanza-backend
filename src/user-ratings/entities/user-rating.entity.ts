import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity()
@Index(['raterId', 'riderId'], { unique: true })
export class UserRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  raterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  rater: User;

  @Column()
  riderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  rider: User;

  @Column({ type: 'int' })
  score: number; // 1 - 5

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
