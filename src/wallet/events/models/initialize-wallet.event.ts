import { Role } from '../../../auth/roles.enum';

export class InitializeWalletEvent {
  constructor(
    public readonly userId: string,
    public readonly role: Role,
  ) {}
}
