import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import banksData from '../../../banks.json';
import {
  BankDto,
  AccountValidationResponseDto,
} from '../dto/bank-response.dto';

@Injectable()
export class BankService {
  private readonly logger = new Logger(BankService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl: string;
  private readonly banks: BankDto[];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.paystackSecretKey =
      this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    this.paystackBaseUrl =
      this.configService.get<string>('PAYSTACK_BASE_URL') || '';
    if (!this.paystackSecretKey || !this.paystackBaseUrl) {
      this.logger.warn(
        'PAYSTACK_SECRET_KEY is not configured in environment variables',
      );
    }
    // Load banks from local JSON file
    this.banks = banksData as BankDto[];
  }

  searchBanks(query?: string): BankDto[] {
    if (!query || query.trim() === '') {
      // Return max 10 active banks if no query provided
      return this.banks
        .filter((bank) => bank.active && !bank.is_deleted)
        .slice(0, 10);
    }

    const searchTerm = query.toLowerCase().trim();

    return this.banks
      .filter((bank) => {
        if (!bank.active || bank.is_deleted) {
          return false;
        }

        return (
          bank.name.toLowerCase().includes(searchTerm) ||
          bank.code.toLowerCase().includes(searchTerm) ||
          bank.slug.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 10);
  }

  async validateAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<AccountValidationResponseDto> {
    if (!this.paystackSecretKey) {
      throw new BadRequestException(
        'Payment service is not configured. Please contact support.',
      );
    }

    const url = `${this.paystackBaseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get(url, {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `Paystack account validation failed: ${error.message}`,
                error.response?.data,
              );

              if (error.response?.status === 422) {
                throw new BadRequestException(
                  'Invalid account number or bank code',
                );
              }

              if (error.response?.status === 400) {
                throw new BadRequestException(
                  error.response.data?.['message'] ||
                    'Invalid request parameters',
                );
              }

              throw new BadRequestException(
                'Unable to validate account. Please try again later.',
              );
            }),
          ),
      );

      if (!data.status) {
        throw new BadRequestException(
          data.message || 'Account validation failed',
        );
      }

      return data.data as AccountValidationResponseDto;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Unexpected error during account validation', error);
      throw new BadRequestException(
        'Unable to validate account. Please try again later.',
      );
    }
  }

  getBankByCode(code: string): BankDto | undefined {
    return this.banks.find(
      (bank) => bank.code === code && bank.active && !bank.is_deleted,
    );
  }
}
