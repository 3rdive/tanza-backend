export class CreateNotficationEvent {
  constructor(
    public readonly title: string,
    public readonly text: string,
    public readonly userId: string,
    public readonly redirect_to: string,
  ) {}
}
