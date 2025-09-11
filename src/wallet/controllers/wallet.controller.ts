import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { JwtPayload } from '../../auth/models/jwt-payload.type';
import { BaseUrl } from '../../constants';
import { CurrentUser } from '../../users/user.decorator';
import { WalletService } from '../services/wallet.service';
import { FundWalletDto } from '../models/fund-wallet.dto';

@Controller(BaseUrl.WALLET)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallet(@CurrentUser() user: JwtPayload) {
    if (!user) {
      throw new BadRequestException('Unauthorized');
    }
    return this.walletService.getWallet(user.sub);
  }

  @Get('virtual-account')
  async getVirtualAccount(@CurrentUser() user: JwtPayload) {
    if (!user) {
      throw new BadRequestException('Unauthorized');
    }
    return this.walletService.getVirtualAccount(user.sub);
  }

  @Post('fund')
  async fundWallet(@Body() dto: FundWalletDto) {
    const { customerCode, transactionReference } = dto;
    return this.walletService.fundWallet(customerCode, transactionReference);
  }
}
