import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BaseUrl } from '../constants';
import { UserRegDto } from './model/user-reg.dto';
import { AuthService } from './service/auth.service';
import { SignInDto } from './model/sign-in.dto';
import { Public } from './public.anotation';

@Controller(BaseUrl.AUTH)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('sign-up')
  register(@Body() userRegDto: UserRegDto) {
    return this.authService.registerUser(userRegDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.emailOrMobile, signInDto.password);
  }
}
