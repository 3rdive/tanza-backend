import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
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
    const envMin = Number(configService.get<string>('MIN_PAYOUT_AMOUNT'));
    this.minPayoutAmount =
      Number.isFinite(envMin) && envMin > 0 ? envMin : 1000;
  }

  /**
   * Runs every Wednesday at 00:30 West Africa Time (WAT).
   *
   * Cron expression breakdown: second minute hour day-of-month month day-of-week
   * '0 30 0 * * 3' => At 00:30 on Wednesday.
   *
   * Note: the job is scheduled with the 'Africa/Lagos' timezone to ensure it runs at 00:30 WAT
   * regardless of the server's local timezone.
   */
  @Cron('0 40 2 * * 3', { timeZone: 'Africa/Lagos' })
  async handleWeeklyPayouts() {
    this.logger.log(
      `Weekly rider payout job started. minPayoutAmount=${this.minPayoutAmount}`,
    );

    try {
      // Find wallets with balance >= threshold and belonging to riders
      const payoutCandidates = await this.walletRepository.find({
        where: {
          walletBalance: MoreThanOrEqual(this.minPayoutAmount),
          user: { role: Role.RIDER },
        },
      });

      this.logger.log(
        `Found ${payoutCandidates.length} rider wallets eligible for payout`,
      );

      for (const wallet of payoutCandidates) {
        try {
          // pick default withdrawal option (bank account) for rider, fallback to any
          const withdrawal =
            (await this.withdrawalOptionsRepository.findOne({
              where: { riderId: wallet.userId, isDefault: true },
            })) ||
            (await this.withdrawalOptionsRepository.findOne({
              where: { riderId: wallet.userId },
            }));

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
              TransactionType.ORDER_REWARD,
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
              transferResult.providerReference,
            );

            // notify rider
            this.eventBus.publish(
              new CreateNotficationEvent(
                'Payout Successful',
                `Your payout of ₦${payoutAmount} has been initiated to ${withdrawal.bankName} ${withdrawal.accountNumber}.`,
                wallet.userId,
                '/wallet',
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
   * - This is a minimal placeholder that attempts a conventional Paystack-style transfer.
   * - Replace the implementation with your production provider integration and robust error handling.
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

    try {
      // NOTE: The exact Paystack endpoints and payloads can differ; this is a generic example.
      // Replace with your provider's required endpoints (create recipient -> initiate transfer -> finalize).
      const payload = {
        // This object should match the transfer API expected by your provider
        source: 'balance',
        amount: Math.round(amount * 100), // provider might expect kobo
        currency: 'NGN',
        reference,
        reason: `Rider payout ${reference}`,
        recipient: {
          name: withdrawal.bankHoldersName,
          account_number: withdrawal.accountNumber,
          bank_name: withdrawal.bankName,
        },
      };

      const url = `${paystackBase}/transfer`; // adjust as needed for your provider

      const resp = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      });

      // Interpret provider response conservatively: require success flag
      if (
        resp?.data &&
        (resp.data.status === true || resp.data.status === 'success')
      ) {
        const providerRef =
          resp.data.data?.reference ??
          resp.data.data?.transfer_code ??
          resp.data.data?.id ??
          reference;
        return { success: true, providerReference: providerRef };
      }

      return {
        success: false,
        message: resp?.data?.message ?? 'Provider returned failure',
      };
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
    providerReference?: string,
  ) {
    const trn = new TransactionDto();
    trn.walletId = wallet.id;
    trn.userId = wallet.userId;
    trn.reference = reference ?? `payout-${Date.now()}`;
    trn.amount = amount;
    trn.status = status;
    trn.type = type;
    trn.description = description ?? `Payout ${status}`;
    // optionally attach provider reference to description or metadata (schema permitting)
    if (providerReference)
      trn.description += ` (providerRef: ${providerReference})`;

    // Publish CreateTransactionEvent - existing handler will persist the transaction
    this.eventBus.publish(new CreateTransactionEvent(trn));
  }
}
