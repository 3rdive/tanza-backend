import {
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  FindOptionsOrder,
} from 'typeorm';

export class PaginationService {
  static async findWithPagination<T extends ObjectLiteral>({
    repository,
    paginationDto: { limit = 10, page = 1 },
    where,
    orderBy = 'createdAt',
    orderDirection = 'DESC',
  }: {
    repository: Repository<T>;
    paginationDto: { limit?: number; page?: number };
    where?: FindOptionsWhere<T>;
    orderBy?: keyof T;
    orderDirection?: 'ASC' | 'DESC';
  }) {
    const skip = (page - 1) * limit;
    const [data, total] = await repository.findAndCount({
      skip,
      take: limit,
      order: orderBy
        ? ({ [orderBy]: orderDirection } as FindOptionsOrder<T>)
        : undefined,
      where,
    });
    return {
      data,
      pagination: {
        total, //total number of items existing
        page, //indexes
        limit, //total number of items fetched
        totalPages: Math.ceil(total / limit), //current index
      },
    };
  }
}
