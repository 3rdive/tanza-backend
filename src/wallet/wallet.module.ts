import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { PayStackWebhookController } from './controllers/pay-stack-webhook.controller';
import { WalletController } from './controllers/wallet.controller';
import { PayStackService } from './services/pay-stack.service';
import { Transactions } from './entities/transaction.entity';
import { VirtualAccount } from './entities/virtual-account.entity';
import { Wallets } from './entities/wallet.entity';
import { WalletService } from './services/wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallets, Transactions, VirtualAccount]),
    UsersModule,
    HttpModule,
  ],
  providers: [WalletService, PayStackService],
  controllers: [WalletController, PayStackWebhookController],
  exports: [WalletService],
})
export class WalletModule {}
