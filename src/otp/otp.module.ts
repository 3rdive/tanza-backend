import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { UsersModule } from '../users/users.module';
import { OtpCreateEventHandler } from './event-handlers/otp-create-event.handler';
import { OtpService } from './services/otp.service';
import { TwilioService } from './services/twilio.service';
import { OtpsEntity } from './otps.entity';
import { OtpController } from './otp.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpsEntity]),
    forwardRef(() => UsersModule),
    CqrsModule,
  ],
  controllers: [OtpController],
  providers: [OtpService, TwilioService, OtpCreateEventHandler],
  exports: [OtpService],
})
export class OtpModule {}
