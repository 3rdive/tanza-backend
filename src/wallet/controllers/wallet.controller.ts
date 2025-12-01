import { Body, Controller, Get, Post } from '@nestjs/common';
import { JwtPayload } from '../../auth/models/jwt-payload.type';
import { BaseUrl } from '../../constants';
import { CurrentUser } from '../../users/user.decorator';
import { WalletService } from '../services/wallet.service';
import { FundWalletDto } from '../models/fund-wallet.dto';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';

@Controller(BaseUrl.WALLET)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallet(@CurrentUser() user: JwtPayload) {
    return this.walletService.getUserWallet(user.sub, user.role as Role);
  }

  @Roles(Role.RIDER)
  @Get('rider')
  async getRiderWallet(@CurrentUser() user: JwtPayload) {
    return this.walletService.getRiderWallet(user.sub);
  }

  @Get('virtual-account')
  async getVirtualAccount(@CurrentUser() user: JwtPayload) {
    return this.walletService.getVirtualAccount(user.sub);
  }

  @Post('fund')
  async fundWallet(@Body() dto: FundWalletDto) {
    const { customerCode, transactionReference } = dto;
    return this.walletService.fundWallet(customerCode, transactionReference);
  }
}
