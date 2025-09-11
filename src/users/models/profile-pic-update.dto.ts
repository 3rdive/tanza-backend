import { IsString } from 'class-validator';

export class ProfilePicUpdateDto {
  @IsString()
  imageUrl: string;
}
