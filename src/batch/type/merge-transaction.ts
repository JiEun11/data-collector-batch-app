import { Transaction } from './transaction';

export interface MergeTransaction extends Transaction {
  productId: string;
}
