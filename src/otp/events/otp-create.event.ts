export class OtpCreateEvent {
  constructor(
    public readonly otp: string,
    public readonly mobile: string,
  ) {}
}
