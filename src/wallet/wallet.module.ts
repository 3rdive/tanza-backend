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

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallets, Transactions, VirtualAccount]),
    UsersModule,
    HttpModule,
  ],
  providers: [
    WalletService,
    PayStackService,
    TransactionService,
    CreateTransactionEventHandler,
  ],
  controllers: [
    WalletController,
    PayStackWebhookController,
    TransactionController,
  ],
  exports: [WalletService],
})
export class WalletModule {}
