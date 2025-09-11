import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletModule } from '../wallet/wallet.module';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), WalletModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
