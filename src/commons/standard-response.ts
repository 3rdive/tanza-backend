export interface IStandardResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export class StandardResponse<T> implements IStandardResponse<T> {
  constructor(
    public success: boolean,
    public message: string,
    public data: T | null = null,
  ) {}

  static ok<T>(data: T, message = 'Request successful'): StandardResponse<T> {
    return new StandardResponse<T>(true, message, data);
  }

  static fail<T>(
    message = 'Request failed',
    data: T | null = null,
  ): StandardResponse<T> {
    return new StandardResponse<T>(false, message, data);
  }
}
