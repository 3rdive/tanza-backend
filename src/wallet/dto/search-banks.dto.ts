import { IsOptional, IsString } from 'class-validator';

export class SearchBanksDto {
  @IsOptional()
  @IsString()
  query?: string;
}
