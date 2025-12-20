import { Transaction } from '../type/transaction';
import { StoreTransaction } from '../type/store-transaction';
import { MergeTransaction } from '../type/merge-transaction';

/**
 *
 * 해당 코드는 지원자 분들의 문제 해결을 돕기 위한 코드입니다.
 * 필요 시, 수정/삭제 하셔도 과제 결과에 영향을 주지 않습니다.
 *
 * @param tx Transaction 데이터
 * @param storeTx StroeTransaction 데이터
 */
export function createMergeTransaction(
  tx: Transaction,
  storeTx: StoreTransaction,
): MergeTransaction {
  if (
    tx.transactionId !== storeTx.transactionId ||
    tx.storeId !== storeTx.storeId
  ) {
    throw new Error('매칭 되지 않는 Transaction 정보 입니다.');
  }

  return {
    amount: tx.amount,
    balance: tx.balance,
    cancelYn: tx.cancelYn,
    date: tx.date,
    storeId: tx.storeId,
    transactionId: tx.transactionId,
    productId: storeTx.productId,
  };
}
