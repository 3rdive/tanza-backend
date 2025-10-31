import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRegDto } from './auth/models/user-reg.dto';
import { Role } from './auth/roles.enum';
import { RegisterUseCase } from './users/services/register.usecase';
import { UserDetailsService } from './users/services/user-details.service';

@Injectable()
export class OnStartUp implements OnApplicationBootstrap {
  constructor(
    private readonly userDetailsService: UserDetailsService,
    private readonly registerUseCase: RegisterUseCase,
    private readonly configService: ConfigService,
  ) {}
  async onApplicationBootstrap() {
    console.log('on application bootstrap');
    // perform app configuration here i.e service charge, etc
    const email = this.configService.get<string>('DEFAULT_ADMIN_EMAIL');
    const mobile = this.configService.get<string>('DEFAULT_ADMIN_MOBILE');
    const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD');
    const existingAdmin = await this.userDetailsService.findByEmailAndMobile(
      email!,
      mobile!,
    );
    if (existingAdmin) {
      console.log('default admin already exists');
    } else {
      const userDto = new UserRegDto();
      userDto.email = email!;
      userDto.mobile = mobile!;
      userDto.password = password!;
      userDto.countryCode = '+234';
      userDto.firstName = 'Abey';
      userDto.lastName = 'Samuel';
      await this.registerUseCase.execute(userDto, Role.Admin);
      console.log('default admin registered successfully');
    }
  }
}
