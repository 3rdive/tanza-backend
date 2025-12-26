import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonsModule } from './commons/commons.module';
import { RequestContextService } from './context/request-context.service';
import { OnStartUp } from './on-startup';
import { OtpModule } from './otp/otp.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { OrderModule } from './order/order.module';
import { UserRatingsModule } from './user-ratings/user-ratings.module';
import { LocationModule } from './location/location.module';
import { StorageMediaModule } from './storage-media/storage-media.module';
import { TaskModule } from './task/task.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';
import { TicketsModule } from './tickets/tickets.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes it available everywhere without re-import
    }),
    CacheModule,
    // Use ConfigService to read env vars
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        logging: config.get<string>('DB_LOGGING', 'false') === 'true',
        ssl:
          config.get<string>('DB_SSL', 'false') === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      }),
    }),

    CommonsModule,
    AuthModule,
    UsersModule,
    OtpModule,
    WalletModule,
    OrderModule,
    UserRatingsModule,
    LocationModule,
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    StorageMediaModule,
    TaskModule,
    TicketsModule,
    AdminModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService, RequestContextService, OnStartUp],
})
export class AppModule {}
