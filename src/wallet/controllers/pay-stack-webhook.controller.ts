// src/wallet/paystack.controllers.ts
import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PayStackService } from '../services/pay-stack.service';
import { WalletService } from '../services/wallet.service';

@Controller('webhooks/paystack')
export class PayStackWebhookController {
  constructor(
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    private readonly paystackService: PayStackService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    const body = JSON.stringify(req.body);

    // Verify Paystack signature
    const hash = crypto
      .createHmac('sha512', secret!)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.log('Invalid Paystack signature');
      return;
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference, customer } = event.data;

      try {
        await this.walletService.fundWallet(
          customer.customer_code as string,
          reference as string,
        );
      } catch (error) {
        console.error('Error verifying Paystack transaction:', error.message);
      }
    }
  }
}
