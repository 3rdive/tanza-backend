import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpModule } from '../otp/otp.module';
import { InitRiderEventHandler } from './init-rider-event.handler';
import { RiderInfo } from './rider-info.entity';
import { RegisterUseCase } from './services/register.usecase';
import { UserDetailsService } from './services/user-details.service';
import { UserController } from './controller/user.controller';
import { User } from './user.entity';
import { UsersService } from './services/users.service';
import { ActiveStatus } from './active-status.entity';
import { ActiveStatusService } from './services/active-status.service';
import { ActiveStatusController } from './controller/active-status.controller';
import { RiderService } from './services/rider.service';
import { RiderController } from './controller/rider.controller';
import { AdminController } from './controller/admin.controller';
import { UsersGateway } from './users.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RiderInfo, ActiveStatus]),
    forwardRef(() => OtpModule),
    CqrsModule,
  ],
  providers: [
    UsersService,
    UserDetailsService,
    ActiveStatusService,
    RiderService,
    InitRiderEventHandler,
    RegisterUseCase,
    UsersGateway,
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
    RegisterUseCase,
  ],
})
export class UsersModule {}
