import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InitRiderEvent } from './init-rider.event';
import { RiderService } from './services/rider.service';
import { WalletService } from 'src/wallet/services/wallet.service';

@EventsHandler(InitRiderEvent)
export class InitRiderEventHandler implements IEventHandler<InitRiderEvent> {
  constructor(private readonly riderService: RiderService) {}

  async handle(event: InitRiderEvent) {
    await this.riderService.initRiderInfo(event.userId);
  }
}
