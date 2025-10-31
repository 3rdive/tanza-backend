import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationModule } from '../location/location.module';
import { WalletModule } from '../wallet/wallet.module';
import { OrderTracking } from './entities/order-tracking.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { UsersModule } from '../users/users.module';
import { RiderGateway } from './riders.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderTracking]),
    WalletModule,
    LocationModule,
    UsersModule,
    JwtModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, RiderGateway],
})
export class OrderModule {}
