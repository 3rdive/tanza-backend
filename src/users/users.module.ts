import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestContextService } from '../context/request-context.service';
import { OtpModule } from '../otp/otp.module';
import { UserDetailsService } from './user-details.service';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), OtpModule],
  providers: [UsersService, UserDetailsService],
  controllers: [UserController],
  exports: [UsersService, UserDetailsService],
})
export class UsersModule {}
