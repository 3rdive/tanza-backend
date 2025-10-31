import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InitRiderEvent } from './init-rider.event';
import { RiderService } from './services/rider.service';

@EventsHandler(InitRiderEvent)
export class InitRiderEventHandler implements IEventHandler<InitRiderEvent> {
  constructor(private readonly riderService: RiderService) {}

  async handle(event: InitRiderEvent) {
    await this.riderService.initRiderInfo(event.userId);
  }
}
