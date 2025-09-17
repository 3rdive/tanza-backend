import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonsModule } from './commons/commons.module';
import { RequestContextService } from './context/request-context.service';
import { OtpModule } from './otp/otp.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { OrderModule } from './order/order.module';
import { UserRatingsModule } from './user-ratings/user-ratings.module';
import { LocationModule } from './location/location.module';
import { StorageMediaModule } from './storage-media/storage-media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes it available everywhere without re-import
    }),
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
    StorageMediaModule,
  ],
  controllers: [AppController],
  providers: [AppService, RequestContextService],
})
export class AppModule {}
