import { EventsHandler, IEventHandler, EventBus } from '@nestjs/cqrs';
import { CreateNotficationEvent } from './create-notification.event';
import { NotificationService } from './notification.service';
import { SendPushNotificationEvent } from './send-push-notification.event';

@EventsHandler(CreateNotficationEvent)
export class CreateNotficationEventHandler
  implements IEventHandler<CreateNotficationEvent>
{
  constructor(
    private readonly notificationService: NotificationService,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: CreateNotficationEvent) {
    await this.notificationService.create(event.userId, event);

    // Trigger push notification event
    this.eventBus.publish(
      new SendPushNotificationEvent(event.userId, event.title, event.text, {
        route: event.redirect_to ?? '(tabs)',
      }),
    );
  }
}
