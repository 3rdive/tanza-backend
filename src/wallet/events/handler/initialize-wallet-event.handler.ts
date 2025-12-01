import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InitializeWalletEvent } from '../models/initialize-wallet.event';
import { WalletService } from '../../services/wallet.service';

@EventsHandler(InitializeWalletEvent)
export class InitializeWalletEventHandler
  implements IEventHandler<InitializeWalletEvent>
{
  constructor(private readonly walletService: WalletService) {}

  async handle(event: InitializeWalletEvent) {
    await this.walletService.initialiseWallet(event.userId, event.role);
  }
}
