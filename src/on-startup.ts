import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRegDto } from './auth/models/user-reg.dto';
import { Role } from './auth/roles.enum';
import { UsersService } from './users/users.service';

@Injectable()
export class OnStartUp implements OnApplicationBootstrap {
  constructor(
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
  ) {}
  async onApplicationBootstrap() {
    console.log('on application bootstrap');
    // perform app configuration here i.e service charge, etc
    const email = this.configService.get<string>('DEFAULT_ADMIN_EMAIL');
    const mobile = this.configService.get<string>('DEFAULT_ADMIN_MOBILE');
    const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD');
    const existingAdmin = await this.userService.findByEmailAndMobile(
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
      await this.userService.register(userDto, Role.Admin);
      console.log('default admin registered successfully');
    }
  }
}
