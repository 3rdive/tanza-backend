import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { PayStackWebhookController } from './controllers/pay-stack-webhook.controller';
import { TransactionController } from './controllers/transaction.controller';
import { WalletController } from './controllers/wallet.controller';
import { CreateTransactionEventHandler } from './events/handler/create-transaction-event.handler';
import { PayStackService } from './services/pay-stack.service';
import { Transactions } from './entities/transaction.entity';
import { VirtualAccount } from './entities/virtual-account.entity';
import { Wallets } from './entities/wallet.entity';
import { TransactionService } from './services/transaction.service';
import { WalletService } from './services/wallet.service';
import { WithdrawalOptions } from './entities/withdrawal-options.entity';
import { WithdrawalOptionsService } from './services/withdrawal-options.service';
import { WithdrawalOptionsController } from './controllers/withdrawal-options.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallets,
      Transactions,
      VirtualAccount,
      WithdrawalOptions,
    ]),
    UsersModule,
    HttpModule,
  ],
  providers: [
    WalletService,
    PayStackService,
    TransactionService,
    CreateTransactionEventHandler,
    WithdrawalOptionsService,
  ],
  controllers: [
    WalletController,
    PayStackWebhookController,
    TransactionController,
    WithdrawalOptionsController,
  ],
  exports: [WalletService],
})
export class WalletModule {}
