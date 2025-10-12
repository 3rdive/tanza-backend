export class WalletDto {
  id: string;
  walletBalance: number;
  createdAt: Date;
  isFrozen: boolean;
  customerCode: string;
  totalAmountEarned?: number;
}
