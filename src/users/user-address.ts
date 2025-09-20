import { IsNotEmpty } from 'class-validator';

export class UserAddress {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  lat: number;

  @IsNotEmpty()
  lon: number;
}
