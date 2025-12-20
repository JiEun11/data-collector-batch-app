import { createMergeTransaction } from './createMergeTransaction';
import { Transaction } from '../type/transaction';
import { StoreTransaction } from '../type/store-transaction';

describe('createMergeTransaction test', function () {
  it('mergeTransaction 을 정상적으로 생성한다.', function () {
    const tx: Transaction = {
      amount: 54726,
      balance: 542,
      cancelYn: 'N',
      date: '2021-01-01',
      storeId: '5460431',
      transactionId: 'cc07167a-c20-4589-9548-000000000000',
    };
    const storeTx: StoreTransaction = {
      storeId: '5460431',
      transactionId: 'cc07167a-c20-4589-9548-000000000000',
      productId: '3242138',
    };
    const actual = createMergeTransaction(tx, storeTx);

    expect(actual).toMatchInlineSnapshot(`
      {
        "amount": 54726,
        "balance": 542,
        "cancelYn": "N",
        "date": "2021-01-01",
        "productId": "3242138",
        "storeId": "5460431",
        "transactionId": "cc07167a-c20-4589-9548-000000000000",
      }
    `);
  });

  it('매칭되지 않는 Transaction과 StoreTransaction 경우에는 오류가 발생한다. ', function () {
    const tx: Transaction = {
      amount: 54726,
      balance: 542,
      cancelYn: 'N',
      date: '2021-01-01',
      storeId: '5460431',
      transactionId: 'cc07167a-c20-4589-9548-000000000000',
    };
    const storeTx: StoreTransaction = {
      storeId: '000000',
      transactionId: 'cc07167a-c20-4589-9548-000000000000',
      productId: '3242138',
    };
    expect(() => createMergeTransaction(tx, storeTx)).toThrowError(
      '매칭 되지 않는 Transaction 정보 입니다.',
    );
  });
});
