import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OtpCreateEvent } from '../events/otp-create.event';
import { TwilioService } from '../services/twilio.service';

@EventsHandler(OtpCreateEvent)
export class OtpCreateEventHandler implements IEventHandler<OtpCreateEvent> {
  constructor(private readonly smsSendingService: TwilioService) {}
  async handle(otpCreateEvent: OtpCreateEvent) {
    await this.smsSendingService.sendMessage(
      otpCreateEvent.mobile,
      otpCreateEvent.otp,
    );
  }
}
