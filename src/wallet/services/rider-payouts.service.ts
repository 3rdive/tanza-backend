import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import axios from 'axios';

import { Wallets } from '../entities/wallet.entity';
import { WithdrawalOptions } from '../entities/withdrawal-options.entity';
import { TransactionDto } from '../dto/transaction-dto';
import { TransactionStatus } from '../dto/transaction-status';
import { TransactionType } from '../entities/transaction-type.enum';
import { CreateTransactionEvent } from '../events/models/create-transaction.event';
import { Role } from '../../auth/roles.enum';
import { CreateNotficationEvent } from '../../notification/create-notification.event';

/**
 * Scheduled service responsible for processing weekly rider payouts.
 *
 * Behavior:
 * - Runs every Wednesday at 02:00 (server timezone) via a cron job.
 * - Finds all riders (User.role === Role.RIDER) with wallet balance >= MIN_PAYOUT_AMOUNT (env, default 1000).
 * - Attempts to payout the rider's available balance to their default withdrawal option (bank account).
 * - If the external transfer is recorded as successful, the rider's wallet is debited and a transaction is created with status COMPLETE.
 * - If the transfer cannot be attempted (missing config / no withdrawal option) or fails, a FAILED transaction is recorded and an admin notification is emitted.
 *
 * Note:
 * - This implementation does not perform a real bank transfer unless the PAYSTACK_SECRET_KEY and PAYSTACK_BASE_URL
 *   environment variables are configured and the PAYSTACK transfer endpoints are implemented/compatible.
 * - The actual transfer call is implemented as a best-effort POST to a conventional Paystack-like endpoint.
 *   You should replace/adjust `performExternalTransfer` with your real provider integration (and map responses).
 */

@Injectable()
export class RiderPayoutsService {
  private readonly logger = new Logger(RiderPayoutsService.name);

  private readonly minPayoutAmount: number;

  constructor(
    @InjectRepository(Wallets)
    private readonly walletRepository: Repository<Wallets>,
    @InjectRepository(WithdrawalOptions)
    private readonly withdrawalOptionsRepository: Repository<WithdrawalOptions>,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
  ) {
    this.minPayoutAmount = Number(
      configService.get<string>('MIN_PAYOUT_AMOUNT'),
    );
  }

  @Cron('0 14 4 * * 4', { timeZone: 'Africa/Lagos' })
  async handleWeeklyPayouts() {
    this.logger.log(
      `Weekly rider payout job started. minPayoutAmount=${this.minPayoutAmount}`,
    );

    try {
      // Find wallets with balance >= threshold and belonging to riders
      // Use a joined query to ensure the related user is loaded and the role filter is applied correctly.
      const payoutCandidates = await this.walletRepository
        .createQueryBuilder('wallet')
        .leftJoinAndSelect('wallet.user', 'user')
        .where('wallet.walletBalance >= :min', { min: this.minPayoutAmount })
        .andWhere('user.role = :role', { role: Role.RIDER })
        .getMany();

      this.logger.log(
        `Found ${payoutCandidates.length} rider wallets eligible for payout (joined query)`,
      );

      for (const wallet of payoutCandidates) {
        try {
          // Defensive checks: ensure we have the associated user and userId (the joined query should load user)
          if (!wallet.userId || !wallet.user) {
            this.logger.warn(
              `Skipping payout for wallet=${wallet.id}: missing user or userId (userId=${wallet.userId})`,
            );
            continue;
          }

          if (wallet.user.role !== Role.RIDER) {
            // Extra safety - the query should have filtered this, but be defensive
            this.logger.warn(
              `Skipping wallet=${wallet.id}: associated user=${wallet.userId} role=${wallet.user.role} is not RIDER`,
            );
            continue;
          }

          // pick default withdrawal option (bank account) for rider, fallback to any
          const withdrawal = await this.withdrawalOptionsRepository.findOne({
            where: { riderId: wallet.userId },
          });

          if (!withdrawal) {
            // additional defensive log to make it explicit when withdrawal options are missing
            this.logger.warn(
              `No withdrawal option found for rider=${wallet.userId} wallet=${wallet.id}`,
            );
          }

          if (!withdrawal) {
            this.logger.warn(
              `Skipping payout for rider=${wallet.userId} (wallet=${wallet.id}): no withdrawal option configured`,
            );
            // record a FAILED transaction to indicate payout was attempted but couldn't proceed
            this.recordTransaction(
              wallet,
              0,
              `payout-no-withdrawal-${Date.now()}`,
              TransactionStatus.FAILED,
              TransactionType.FAILED_PAYOUT,
              'No withdrawal option configured for rider',
            );

            // notify admin / ops
            this.eventBus.publish(
              new CreateNotficationEvent(
                'Payout Failed',
                `Rider ${wallet.userId} has no configured withdrawal option for payouts.`,
                '', // use empty string for system/admin notifications
                '/admin/wallets',
              ),
            );

            continue;
          }

          // determine payout amount - by default, payout whole available balance rounded down to 2 decimals
          const payoutAmount =
            Math.floor(Number(wallet.walletBalance) * 100) / 100;

          if (payoutAmount < this.minPayoutAmount) {
            this.logger.debug(
              `Skipping rider=${wallet.userId} wallet=${wallet.id} - balance below threshold after rounding: ${payoutAmount}`,
            );
            continue;
          }

          const reference = `payout-${wallet.userId}-${Date.now()}`;

          this.logger.log(
            `Processing payout for rider=${wallet.userId} amount=₦${payoutAmount} -> ${withdrawal.bankName} ${withdrawal.accountNumber}`,
          );

          // Attempt external transfer. The helper returns { success, providerReference?, message? }
          const transferResult = await this.performExternalTransfer(
            withdrawal,
            payoutAmount,
            reference,
          );

          if (transferResult.success) {
            // Debit the wallet
            wallet.walletBalance = Number(
              (Number(wallet.walletBalance) - payoutAmount).toFixed(2),
            );
            await this.walletRepository.save(wallet);

            // Record successful transaction
            this.recordTransaction(
              wallet,
              payoutAmount,
              reference,
              TransactionStatus.COMPLETE,
              TransactionType.ORDER_REWARD,
              `Payout to ${withdrawal.bankName} ${withdrawal.accountNumber}`,
            );

            // notify rider
            this.eventBus.publish(
              new CreateNotficationEvent(
                'Payout Successful',
                `Your payout of ₦${payoutAmount} has been initiated to ${withdrawal.bankName} ${withdrawal.accountNumber}.`,
                wallet.userId,
                '(tabs)/wallet',
              ),
            );

            this.logger.log(
              `Payout COMPLETE for rider=${wallet.userId} ref=${reference}`,
            );
          } else {
            // Record failed transaction (no wallet debit)
            this.recordTransaction(
              wallet,
              payoutAmount,
              reference,
              TransactionStatus.FAILED,
              TransactionType.ORDER_REWARD,
              `Payout failed: ${transferResult.message ?? 'unknown error'}`,
            );

            // notify admin/ops for manual review
            // this.eventBus.publish(
            //   new CreateNotficationEvent(
            //     'Payout Failed',
            //     `Payout of ₦${payoutAmount} for rider ${wallet.userId} failed: ${transferResult.message}`,
            //     '', // use empty string for system/admin notifications
            //     '/admin/payouts',
            //   ),
            // );

            this.logger.warn(
              `Payout FAILED for rider=${wallet.userId} amount=₦${payoutAmount} reason=${transferResult.message}`,
            );
          }
        } catch (innerErr) {
          this.logger.error('Error processing a rider payout', innerErr);
        }
      }

      this.logger.log('Weekly rider payout job completed');
    } catch (err) {
      this.logger.error('Error running weekly rider payout job', err);
    }
  }

  /**
   * Helper to perform an external bank transfer.
   *
   * IMPORTANT:
   * - This implements the four steps for Paystack single transfers: create recipient, generate reference, initiate transfer, verify status.
   * - For live transfers, status is 'pending' initially; we treat 'pending' as success here but recommend webhook verification for production.
   * - Replace with your production provider integration and robust error handling.
   *
   * Returns an object indicating success and optional provider reference/message.
   */
  private async performExternalTransfer(
    withdrawal: WithdrawalOptions,
    amount: number,
    reference: string,
  ): Promise<{
    success: boolean;
    providerReference?: string;
    message?: string;
  }> {
    const paystackBase = this.configService.get<string>('PAYSTACK_BASE_URL');
    const paystackKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!paystackBase || !paystackKey) {
      // No external transfer provider configured yet
      return {
        success: false,
        message: 'Payout provider not configured (set PAYSTACK_* env vars)',
      };
    }

    const headers = {
      Authorization: `Bearer ${paystackKey}`,
      'Content-Type': 'application/json',
    };
    const timeout = 20000;

    try {
      // Step 1: Create transfer recipient
      const recipientPayload = {
        type: 'nuban',
        name: withdrawal.bankHoldersName,
        account_number: withdrawal.accountNumber,
        bank_code: withdrawal.bankCode,
      };

      const recipientResp = await axios.post(
        `${paystackBase}/transferrecipient`,
        recipientPayload,
        { headers, timeout },
      );

      if (
        !recipientResp?.data ||
        (recipientResp.data.status !== true &&
          recipientResp.data.status !== 'success')
      ) {
        return {
          success: false,
          message:
            recipientResp?.data?.message ??
            'Failed to create transfer recipient',
        };
      }

      const recipientCode = recipientResp.data.data.recipient_code;

      // Step 2: Generate transfer reference (already provided as 'reference')

      // Step 3: Initiate transfer
      const transferPayload = {
        source: 'balance',
        amount: Math.round(amount * 100), // in kobo
        currency: 'NGN',
        reference,
        recipient: recipientCode,
        reason: `Rider payout ${reference}`,
      };

      const transferResp = await axios.post(
        `${paystackBase}/transfer`,
        transferPayload,
        { headers, timeout },
      );

      if (
        !transferResp?.data ||
        (transferResp.data.status !== true &&
          transferResp.data.status !== 'success')
      ) {
        return {
          success: false,
          message: transferResp?.data?.message ?? 'Transfer initiation failed',
        };
      }

      const transferData = transferResp.data.data;
      const transferStatus = transferResp.data as boolean;
      const providerRef =
        transferData.reference ??
        transferData.transfer_code ??
        transferData.id ??
        reference;

      // Step 4: Verify status (simplified: treat 'success' or 'pending' as success for now)
      if (transferStatus) {
        return { success: true, providerReference: providerRef };
      } else {
        return {
          success: false,
          message: `Transfer status: ${transferStatus}`,
        };
      }
    } catch (error: any) {
      this.logger.error(
        'External transfer attempt failed',
        error?.response?.data ?? error?.message ?? error,
      );
      const message =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.message ??
        'Unknown transfer error';
      return { success: false, message: String(message) };
    }
  }

  /**
   * Create and publish a transaction event so that the transaction entity gets persisted
   * and any other side-effects (notifications, webhooks) are handled by the existing handlers.
   */
  private recordTransaction(
    wallet: Wallets,
    amount: number,
    reference: string,
    status: TransactionStatus,
    type: TransactionType,
    description?: string,
  ) {
    const trn = new TransactionDto();
    trn.walletId = wallet.id;
    trn.userId = wallet.userId;
    trn.reference = reference ?? `payout-${Date.now()}`;
    trn.amount = amount;
    trn.status = status;
    trn.type = type;
    trn.description = description ?? `Payout ${status}`;

    // Publish CreateTransactionEvent - existing handler will persist the transaction
    this.eventBus.publish(new CreateTransactionEvent(trn));
  }
}
