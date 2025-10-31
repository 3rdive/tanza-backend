import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../commons/pagination.dto';
import { PaginationService } from '../commons/pagination.service';
import { StandardResponse } from '../commons/standard-response';
import { User } from '../users/user.entity';
import { RateUserDto } from './dto/rate-user.dto';
import { UserRating } from './entities/user-rating.entity';

@Injectable()
export class UserRatingsService {
  constructor(
    @InjectRepository(UserRating)
    private readonly ratingRepo: Repository<UserRating>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async rateUser(userId: string, dto: RateUserDto) {
    if (userId === dto.targetUserId) {
      throw new BadRequestException(
        StandardResponse.fail('You cannot rate yourself'),
      );
    }

    const rider = await this.userRepo.findOne({
      where: { id: dto.targetUserId },
    });
    if (!rider) {
      throw new BadRequestException(
        StandardResponse.fail('target user not found'),
      );
    }

    let rating = await this.ratingRepo.findOne({
      where: { reviewerId: userId, targetUserId: dto.targetUserId },
    });

    if (rating) {
      rating.starRating = dto.starRating;
      rating.comment = dto.comment;
    } else {
      rating = this.ratingRepo.create({
        reviewerId: userId,
        targetUserId: dto.targetUserId,
        starRating: dto.starRating,
        comment: dto.comment ?? null,
      });
    }

    const saved = await this.ratingRepo.save(rating);
    return StandardResponse.ok(
      saved,
      rating ? 'Review updated' : 'Review created',
    );
  }

  async getById(id: string) {
    const rating = await this.ratingRepo.findOne({ where: { id } });
    if (!rating) {
      throw new BadRequestException(StandardResponse.fail('rating not found'));
    }

    return StandardResponse.ok(rating, 'Rating fetched successfully');
  }

  // usecase: check rider's ratings
  async listUserRatings(userId: string, paginationDto: PaginationDto) {
    const { data, pagination } =
      await PaginationService.findWithPagination<UserRating>({
        repository: this.ratingRepo,
        paginationDto: { limit: paginationDto.limit, page: paginationDto.page },
        where: { targetUserId: userId },
      });
    return StandardResponse.withPagination(
      data,
      'Ratings fetched successfully',
      pagination,
    );
  }
}
