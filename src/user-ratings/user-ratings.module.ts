import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { UserRating } from './entities/user-rating.entity';
import { UserRatingsController } from './user-ratings.controller';
import { UserRatingsService } from './user-ratings.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRating, User])],
  providers: [UserRatingsService],
  controllers: [UserRatingsController],
})
export class UserRatingsModule {}
