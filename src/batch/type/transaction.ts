export interface Transaction {
  amount: number;
  balance: number;
  cancelYn: 'Y' | 'N';
  date: string; // yyyy-MM-dd
  storeId: string;
  transactionId: string;
}
