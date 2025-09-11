import { IsOptional, IsString, Length } from 'class-validator';

export class ProfileUpdateDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  profilePic?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5)
  countryCode?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}
