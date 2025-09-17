export interface IStandardResponse<T> {
  success: boolean;
  message: string;
  data: T | T[] | null;
  pagination?: Pagination | null;
}

class Pagination {
  total: number; //total number of items existing
  page: number; //indexes
  limit: number; //total number of items fetched
  totalPages: number; //current index
}

export class StandardResponse<T> implements IStandardResponse<T> {
  constructor(
    public success: boolean,
    public message: string,
    public data: T | T[] | null = null,
    public pagination?: Pagination | null,
  ) {}

  static ok<T>(data: T, message = 'Request successful'): StandardResponse<T> {
    return new StandardResponse<T>(true, message, data);
  }

  static withPagination<T>(
    data: T[],
    message = 'Request successful',
    pagination: Pagination,
  ): StandardResponse<T> {
    return new StandardResponse<T>(true, message, data, pagination);
  }

  static fail<T>(
    message = 'Request failed',
    data: T | null = null,
  ): StandardResponse<T> {
    return new StandardResponse<T>(false, message, data);
  }
}
