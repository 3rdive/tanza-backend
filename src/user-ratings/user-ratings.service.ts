import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { PaginationDto } from '../commons/pagination.dto';
import { PaginationService } from '../commons/pagination.service';
import { StandardResponse } from '../commons/standard-response';
import { User } from '../users/user.entity';
import { RateRiderDto } from './dto/rate-rider.dto';
import { UserRating } from './entities/user-rating.entity';

@Injectable()
export class UserRatingsService {
  constructor(
    @InjectRepository(UserRating)
    private readonly ratingRepo: Repository<UserRating>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async rateRider(raterId: string, dto: RateRiderDto) {
    if (raterId === dto.riderId) {
      throw new BadRequestException(
        StandardResponse.fail('You cannot rate yourself'),
      );
    }

    const rider = await this.userRepo.findOne({ where: { id: dto.riderId } });
    if (!rider) {
      throw new BadRequestException(StandardResponse.fail('rider not found'));
    }
    if (rider.role !== Role.RIDER) {
      throw new BadRequestException(
        StandardResponse.fail('user is not a rider'),
      );
    }

    let rating = await this.ratingRepo.findOne({
      where: { raterId, riderId: dto.riderId },
    });

    if (rating) {
      rating.score = dto.score;
      rating.comment = dto.comment;
    } else {
      rating = this.ratingRepo.create({
        raterId,
        riderId: dto.riderId,
        score: dto.score,
        comment: dto.comment ?? null,
      });
    }

    const saved = await this.ratingRepo.save(rating);
    return StandardResponse.ok(
      saved,
      rating ? 'Rating updated' : 'Rating created',
    );
  }

  async getByRiderAndUser(riderId: string, userId: string) {
    const rating = await this.ratingRepo.findOne({
      where: { riderId, raterId: userId },
    });
    return StandardResponse.ok(rating);
  }

  async getById(id: string) {
    const rating = await this.ratingRepo.findOne({ where: { id } });
    if (!rating) {
      throw new BadRequestException(StandardResponse.fail('rating not found'));
    }
    return StandardResponse.ok(rating);
  }

  async listRiderRatings(riderId: string, paginationDto: PaginationDto) {
    const rider = await this.userRepo.findOne({ where: { id: riderId } });
    if (!rider) {
      throw new BadRequestException(StandardResponse.fail('rider not found'));
    }
    const { data, pagination } =
      await PaginationService.findWithPagination<UserRating>({
        repository: this.ratingRepo,
        paginationDto: { limit: paginationDto.limit, page: paginationDto.page },
        where: { riderId },
      });
    return StandardResponse.withPagination(
      data,
      'Ratings fetched successfully',
      pagination,
    );
  }
}
