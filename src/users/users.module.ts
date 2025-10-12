import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpModule } from '../otp/otp.module';
import { RiderInfo } from './rider-info.entity';
import { UserDetailsService } from './services/user-details.service';
import { UserController } from './controller/user.controller';
import { User } from './user.entity';
import { UsersService } from './services/users.service';
import { ActiveStatus } from './actvie-status.entity';
import { ActiveStatusService } from './services/active-status.service';
import { ActiveStatusController } from './controller/active-status.controller';
import { RiderService } from './services/rider.service';
import { RiderController } from './controller/rider.controller';
import { AdminController } from './controller/admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RiderInfo, ActiveStatus]),
    OtpModule,
  ],
  providers: [
    UsersService,
    UserDetailsService,
    ActiveStatusService,
    RiderService,
  ],
  controllers: [
    UserController,
    ActiveStatusController,
    RiderController,
    AdminController,
  ],
  exports: [
    UsersService,
    UserDetailsService,
    ActiveStatusService,
    RiderService,
  ],
})
export class UsersModule {}
