import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private client: Twilio;
  constructor(private readonly configService: ConfigService) {
    this.client = new Twilio(
      configService.get('TWILIO_SID'),
      configService.get('TWILIO_AUTH_TOKEN'),
    );
  }

  async sendMessage(to: string, otpCode: string) {
    try {
      const twilioMobileNumber =
        this.configService.get<string>('TWILIO_MOBILE');

      if (!twilioMobileNumber) {
        console.info(
          'Twilio mobile number not configured. Skipping SMS send. are u in dev?',
        );
        return;
      }
      return this.client.messages.create({
        from: twilioMobileNumber,
        to: `+234${to}`,
        body: `Your OTP is ${otpCode}. Please do not share with anyone`,
      });
    } catch (err) {
      console.log(err);
    }
  }
}
