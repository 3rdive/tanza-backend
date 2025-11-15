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
import { VehicleDocumentSettings } from './entities/vehicle-document-settings.entity';
import { RiderDocument } from './entities/rider-document.entity';
import { VehicleDocumentSettingsService } from './services/vehicle-document-settings.service';
import { RiderDocumentService } from './services/rider-document.service';
import { Order } from '../order/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RiderInfo,
      ActiveStatus,
      VehicleDocumentSettings,
      RiderDocument,
      Order,
    ]),
    forwardRef(() => OtpModule),
    CqrsModule,
  ],
  providers: [
    UsersService,
    UserDetailsService,
    ActiveStatusService,
    RiderService,
    VehicleDocumentSettingsService,
    RiderDocumentService,
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
    VehicleDocumentSettingsService,
    RiderDocumentService,
    RegisterUseCase,
  ],
})
export class UsersModule {}
