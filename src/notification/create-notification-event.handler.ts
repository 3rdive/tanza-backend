import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CreateNotficationEvent } from './create-notification.event';
import { NotificationService } from './notification.service';

@EventsHandler(CreateNotficationEvent)
export class CreateNotficationEventHandler
  implements IEventHandler<CreateNotficationEvent>
{
  constructor(private readonly notificationService: NotificationService) {}
  async handle(event: CreateNotficationEvent) {
    await this.notificationService.create(event.userId, event);
  }
}
