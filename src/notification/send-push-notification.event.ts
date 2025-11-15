export class SendPushNotificationEvent {
  constructor(
    public readonly userId: string,
    public readonly title: string,
    public readonly body: string,
  ) {}
}
