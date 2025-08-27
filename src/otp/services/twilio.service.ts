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
      return this.client.messages.create({
        from: `whatsapp:+${twilioMobileNumber}`,
        to: `whatsapp:${to}`,
        contentSid: this.configService.get<string>('TWILIO_CONTENT_SID'),
        contentVariables: JSON.stringify({ otp_code: String(otpCode) }),
      });
    } catch (err) {
      console.log(err);
    }
  }
}
