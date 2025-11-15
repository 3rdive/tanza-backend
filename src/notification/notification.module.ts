import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification } from './notification.entity';
import { CreateNotficationEventHandler } from './create-notification-event.handler';
import { SendPushNotificationEventHandler } from './send-push-notification-event.handler';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]), CqrsModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    CreateNotficationEventHandler,
    SendPushNotificationEventHandler,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
