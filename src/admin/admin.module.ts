import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from '../users/controller/admin.controller';
import { UsersModule } from '../users/users.module';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { Order } from '../order/entities/order.entity';
import { OrderTracking } from '../order/entities/order-tracking.entity';
import { Wallets } from '../wallet/entities/wallet.entity';
import { Transactions } from '../wallet/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Order,
      OrderTracking,
      Wallets,
      Transactions,
    ]),
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
