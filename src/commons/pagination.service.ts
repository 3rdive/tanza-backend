import { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

export class PaginationService {
  static async findWithPagination<T extends ObjectLiteral>({
    repository,
    paginationDto: { take = 10, page = 1 },
    where,
  }: {
    repository: Repository<T>;
    paginationDto: { take?: number; page?: number };
    where?: FindOptionsWhere<T>;
  }) {
    const skip = (page - 1) * take;
    const [data, total] = await repository.findAndCount({
      skip,
      take: take,
      where,
    });
    return {
      data,
      pagination: {
        total, //total number of items existing
        page, //indexes
        take, //total number of items fetched
        totalPages: Math.ceil(total / take), //current index
      },
    };
  }
}
