import { IsArray, IsUUID } from 'class-validator';

export class MarkAsSeenDto {
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds: string[];
}
