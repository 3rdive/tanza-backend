import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PaystackTransaction } from '../dto/verify-transaction.response';

@Injectable()
export class PayStackService {
  constructor(private readonly configService: ConfigService) {}

  async createWalletForUser(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    const BASEURL = this.configService.get<string>('PAYSTACK_BASE_URL');
    const environment = this.configService.get<string>('NODE_ENV');
    const bearerToken = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    // 1. Create customer on Paystack
    const customerRes = await axios.post(
      `${BASEURL}/customer`,
      {
        email,
        first_name: firstName,
        last_name: `${lastName}/TANZA`,
      },
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    );

    const customer = customerRes.data.data;

    // 2. Create dedicated account for that customer
    const dvaRes = await axios.post(
      `${BASEURL}/dedicated_account`,
      {
        customer: customer.customer_code,
        preferred_bank:
          environment === 'production' ? 'titan-paystack' : 'test-bank', // or wema-bank, etc.
      },
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    );

    const dva = dvaRes.data.data;

    console.log('dva: ', dva);

    return {
      customerCode: customer.customer_code,
      bankName: dva.bank.name,
      accountNumber: dva.account_number,
      accountName: dva.account_name,
    };
  }

  async verifyTransaction(
    reference: string,
  ): Promise<PaystackTransaction | null> {
    try {
      const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
      const BASEURL = this.configService.get<string>('PAYSTACK_BASE_URL');
      const verifyRes = await axios.get(
        `${BASEURL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${secret}`,
          },
        },
      );

      return verifyRes.data.data as PaystackTransaction;
    } catch (error) {
      console.error('Error verifying Paystack transaction:', error.message);
      return null;
    }
  }
}
