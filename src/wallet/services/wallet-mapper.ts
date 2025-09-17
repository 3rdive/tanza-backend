import { TransactionResponse } from '../dto/transaction.response';
import { WalletDto } from '../dto/wallet.dto';
import { VirtualAccountDto } from '../dto/virtual-account.dto';
import { Transactions } from '../entities/transaction.entity';
import { Wallets } from '../entities/wallet.entity';
import { VirtualAccount } from '../entities/virtual-account.entity';

export class WalletMapper {
  static mapToWalletDto(wallet: Wallets): WalletDto {
    return {
      id: wallet.id,
      walletBalance: wallet.walletBalance,
      createdAt: wallet.createdAt,
      isFrozen: wallet.isFrozen,
      customerCode: wallet.customerCode,
    };
  }

  static mapToVirtualAccountDto(va: VirtualAccount): VirtualAccountDto {
    return {
      id: va.id,
      accountName: va.accountName,
      accountNumber: va.accountNumber,
      bankName: va.bankName,
      customerCode: va.customerCode,
    };
  }

  static mapToTransactionResponse(
    transactions: Transactions,
  ): TransactionResponse {
    return {
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      createdAt: transactions.createdAt,
      orderId: transactions.orderId,
      description: transactions.description,
      status: transactions.status,
    };
  }

  static mapListToTransactionResponse(
    transactionList: Transactions[],
  ): TransactionResponse[] {
    return transactionList.map((transaction) =>
      this.mapToTransactionResponse(transaction),
    );
  }
}
