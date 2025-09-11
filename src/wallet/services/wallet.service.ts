import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StandardResponse } from '../../commons/standard-response';
import { UserDetailsService } from '../../users/user-details.service';
import { VirtualAccount } from '../entities/virtual-account.entity';
import { Wallets } from '../entities/wallet.entity';
import { PayStackService } from './pay-stack.service';
import { WalletMapper } from './wallet-mapper';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallets)
    private readonly walletRepository: Repository<Wallets>,
    @InjectRepository(VirtualAccount)
    private readonly virtualAccountRepository: Repository<VirtualAccount>,
    private readonly userDetailsService: UserDetailsService,
    private readonly payStackService: PayStackService,
  ) {}

  async deductAmount(userId: string, amount: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new BadRequestException(StandardResponse.fail('wallet not found'));
    }
    wallet.walletBalance = wallet.walletBalance + amount;
    await this.walletRepository.save(wallet);
  }

  async initialiseWallet(userId: string) {
    const user = await this.userDetailsService.findOneOrThrow(userId);

    const dva = await this.payStackService.createWalletForUser(
      userId,
      user.email,
      user.firstName,
      user.lastName,
    );
    const virtualAccount = this.virtualAccountRepository.create({
      userId,
      customerCode: dva.customerCode,
      accountNumber: dva.accountNumber,
      bankName: dva.bankName,
      accountName: dva.accountName,
    });

    await this.virtualAccountRepository.save(virtualAccount);
    const wallet = this.walletRepository.create({
      userId: userId,
      virtualAccountId: virtualAccount.id,
      customerCode: dva.customerCode,
    });
    await this.walletRepository.save(wallet);

    return wallet;
  }

  async getWallet(userId: string) {
    let wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.initialiseWallet(userId);
    }

    return WalletMapper.mapToWalletDto(wallet);
  }

  async getVirtualAccount(userId: string) {
    // Ensure wallet and virtual account exist for the user
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new BadRequestException(
        StandardResponse.fail('wallet not initialised'),
      );
    }

    // Load or retrieve the virtual account linked to user
    const virtualAccount = await this.virtualAccountRepository.findOne({
      where: { userId },
    });

    if (!virtualAccount) {
      throw new BadRequestException(
        StandardResponse.fail('virtual account not found'),
      );
    }

    return WalletMapper.mapToVirtualAccountDto(virtualAccount);
  }

  async fundWallet(customerCode: string, transactionReference: string) {
    const verifyData =
      await this.payStackService.verifyTransaction(transactionReference);

    if (!verifyData) {
      return 'Payment Verification Failed. Please contact support account not funded';
    }
    if (verifyData.status === 'success') {
      const wallet = await this.walletRepository.findOne({
        where: { customerCode },
      });

      if (!wallet) {
        throw new BadRequestException(
          StandardResponse.fail('wallet not found'),
        );
      }
      const creditedAmount = verifyData.amount / 100; // convert from kobo
      wallet.walletBalance = wallet.walletBalance + creditedAmount;
      await this.walletRepository.save(wallet);

      console.log(
        `Wallet credited: ${customerCode} +₦${creditedAmount} (ref: ${transactionReference})`,
      );

      return 'payment successful';
    } else {
      return 'Payment Verification Failed. Please contact support account not funded';
    }
  }
}
