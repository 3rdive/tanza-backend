import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SendPushNotificationEvent } from './send-push-notification.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Logger } from '@nestjs/common';

@EventsHandler(SendPushNotificationEvent)
export class SendPushNotificationEventHandler
  implements IEventHandler<SendPushNotificationEvent>
{
  private readonly logger = new Logger(SendPushNotificationEventHandler.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handle(event: SendPushNotificationEvent) {
    try {
      // Fetch the user to get their push notification token
      const user = await this.userRepository.findOne({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(`User not found: ${event.userId}`);
        return;
      }

      if (!user.expoPushNotificationToken || !user.hasSetUpNotification) {
        this.logger.debug(
          `User ${event.userId} does not have push notifications set up`,
        );
        return;
      }

      // Send push notification to Expo
      const message = {
        to: user.expoPushNotificationToken,
        title: event.title,
        body: event.body,
        sound: 'default',
        data: event.data ?? { route: '(tabs)' },
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (response.ok) {
        this.logger.log(
          `Push notification sent successfully to user ${event.userId}`,
        );
      } else {
        this.logger.error(
          `Failed to send push notification to user ${event.userId}:`,
          result,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending push notification to user ${event.userId}:`,
        error,
      );
    }
  }
}
