import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BaseUrl } from '../constants';
import { PasswordResetDto } from '../users/models/password-reset.dto';
import { UserRegDto } from './models/user-reg.dto';
import { AuthService } from './services/auth.service';
import { SignInDto } from './models/sign-in.dto';
import { Public } from './public.anotation';

@Public()
@Controller(BaseUrl.AUTH)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-up')
  register(@Body() userRegDto: UserRegDto) {
    return this.authService.registerUser(userRegDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.emailOrMobile, signInDto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    return this.authService.resetPassword(passwordResetDto);
  }
}
