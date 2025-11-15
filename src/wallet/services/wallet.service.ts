import { BadRequestException, Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StandardResponse } from '../../commons/standard-response';
import { UserDetailsService } from '../../users/services/user-details.service';
import { TransactionDto } from '../dto/transaction-dto';
import { TransactionStatus } from '../dto/transaction-status';
import { TransactionType } from '../entities/transaction-type.enum';
import { VirtualAccount } from '../entities/virtual-account.entity';
import { Wallets } from '../entities/wallet.entity';
import { CreateTransactionEvent } from '../events/models/create-transaction.event';
import { PayStackService } from './pay-stack.service';
import { TransactionService } from './transaction.service';
import { WalletMapper } from './wallet-mapper';
import { Role } from '../../auth/roles.enum';
import { CreateNotficationEvent } from '../../notification/create-notification.event';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallets)
    private readonly walletRepository: Repository<Wallets>,
    @InjectRepository(VirtualAccount)
    private readonly virtualAccountRepository: Repository<VirtualAccount>,
    private readonly userDetailsService: UserDetailsService,
    private readonly payStackService: PayStackService,
    private readonly transactionService: TransactionService,
    private readonly eventBus: EventBus,
  ) {}

  async deductAmount(userId: string, amount: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new BadRequestException(StandardResponse.fail('wallet not found'));
    }
    wallet.walletBalance = wallet.walletBalance + amount;
    await this.walletRepository.save(wallet);
  }

  async initialiseWallet(userId: string, role = Role.User) {
    const user = await this.userDetailsService.findOneOrThrow(userId);

    let dva: any;
    let virtualAccount: VirtualAccount | undefined;
    if (role === Role.User) {
      dva = await this.payStackService.createWalletForUser(
        userId,
        user.email,
        user.firstName,
        user.lastName,
      );
      virtualAccount = this.virtualAccountRepository.create({
        userId,
        customerCode: dva.customerCode,
        accountNumber: dva.accountNumber,
        bankName: dva.bankName,
        accountName: dva.accountName,
      });
      await this.virtualAccountRepository.save(virtualAccount);
    }

    const wallet = this.walletRepository.create({
      userId: userId,
      virtualAccountId: virtualAccount?.id,
      customerCode: dva?.customerCode,
      walletBalance: 0,
    });
    await this.walletRepository.save(wallet);

    return wallet;
  }

  async getUserWallet(userId: string) {
    let wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.initialiseWallet(userId, Role.User);
    }

    return WalletMapper.mapToWalletDto(wallet);
  }

  async getRiderWallet(userId: string) {
    let wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.initialiseWallet(userId, Role.RIDER);
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

  async fundWallet(
    customerCode: string,
    transactionReference: string,
    description?: string,
  ) {
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

      const isExisting = await this.transactionService.checkExistingTransaction(
        wallet.userId,
        transactionReference,
      );
      if (isExisting) {
        console.log(
          `Transaction with reference ${transactionReference} already existing`,
        );
        return 'Payment Verification Failed. Transaction already exists';
      }
      wallet.walletBalance = wallet.walletBalance + creditedAmount;
      await this.walletRepository.save(wallet);

      const trn = new TransactionDto();
      trn.walletId = wallet.id;
      trn.userId = wallet.userId;
      trn.reference = transactionReference;
      trn.amount = creditedAmount;
      trn.status = TransactionStatus.COMPLETE;
      trn.type = TransactionType.DEPOSIT;
      trn.description = description ?? `Wallet Top-up with +₦${creditedAmount}`;
      this.eventBus.publish(new CreateTransactionEvent(trn));

      console.log(
        `Wallet credited: ${customerCode} +₦${creditedAmount} (ref: ${transactionReference})`,
      );

      this.eventBus.publish(
        new CreateNotficationEvent(
          'Wallet Funded',
          `Your wallet has been credited with ₦${creditedAmount}`,
          wallet.userId,
          '/wallet',
        ),
      );

      return 'payment successful';
    } else {
      return 'Payment Verification Failed. Please contact support account not funded';
    }
  }

  async saveWallet(wallet: Wallets) {
    return await this.walletRepository.save(wallet);
  }

  async findWalletByUserId(userId: string) {
    return await this.walletRepository.findOne({
      where: { userId },
    });
  }
}
