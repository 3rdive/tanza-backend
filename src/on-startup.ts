import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRegDto } from './auth/models/user-reg.dto';
import { Role } from './auth/roles.enum';
import { RegisterUseCase } from './users/services/register.usecase';
import * as bcrypt from 'bcrypt';
import { UserDetailsService } from './users/services/user-details.service';
import { VehicleDocumentSettingsService } from './users/services/vehicle-document-settings.service';
import e from 'express';

@Injectable()
export class OnStartUp implements OnApplicationBootstrap {
  constructor(
    private readonly userDetailsService: UserDetailsService,
    private readonly registerUseCase: RegisterUseCase,
    private readonly configService: ConfigService,
    private readonly vehicleDocumentSettingsService: VehicleDocumentSettingsService,
  ) {}
  async onApplicationBootstrap() {
    console.log('on application bootstrap');

    // Initialize default vehicle document settings
    await this.vehicleDocumentSettingsService.initializeDefaultSettings();
    console.log('Vehicle document settings initialized');

    // perform app configuration here i.e service charge, etc
    const email = this.configService.get<string>('DEFAULT_ADMIN_EMAIL');
    const mobile = this.configService.get<string>('DEFAULT_ADMIN_MOBILE');
    const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD');

    if (!email || !mobile || !password) {
      throw new Error('Missing required configuration values');
    }

    const saltRounds = 10; // Define the cost factor for hashing
    const hashPassword = await bcrypt.hash(password, saltRounds);
    const existingAdmin = await this.userDetailsService.findByEmailAndMobile(
      email,
      mobile,
    );
    if (existingAdmin) {
      console.log('default admin already exists');
    } else {
      const userDto = new UserRegDto();
      userDto.email = email;
      userDto.mobile = mobile;
      userDto.password = hashPassword;
      userDto.countryCode = '+234';
      userDto.firstName = 'Abey';
      userDto.lastName = 'Samuel';
      await this.registerUseCase.execute(userDto, Role.Admin, true);
      console.log('default admin registered successfully');
    }
  }
}
