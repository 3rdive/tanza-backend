import { IsNotEmpty, IsString } from 'class-validator';

export class SetPushNotificationTokenDto {
  @IsNotEmpty()
  @IsString()
  expoPushNotificationToken: string;
}
