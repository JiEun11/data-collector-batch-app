import axios, { AxiosInstance } from 'axios';
import { Transaction, TransactionFetcher } from '../../type/transaction';
import { createRetryPolicy } from '../../../common/utils/retry';
import { BatchLogger } from '../../../log/type/batch-logger';
import { Api4003PortResponse } from '../../../../data-source/type/ApiResponse';

/**
 * @description 4003 포트에서 Transaction을 가져오는 Fetcher
 * - HTTP Method: POST
 * - 응답 형식: JSON (대문자 키)
 * - Retry 횟수: 3번
 *
 * 요청 예시: { "page": 1 }
 * 응답 예시: { "transactionList": [{ "AMOUNT": 100, "BALANCE": 50, ... }] }
 */
export class Port4003Fetcher implements TransactionFetcher {
  private axiosInstance: AxiosInstance;
  private retryPolicy: (fn: () => Promise<any>) => Promise<any>;

  constructor(private logger: BatchLogger) {
    this.axiosInstance = axios.create({
      baseURL: 'http://localhost:4003',
      timeout: 2000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.retryPolicy = createRetryPolicy(3, 200); // 3번 재시도
  }

  async fetch(page: number): Promise<Transaction[]> {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error('page must be integer >= 1');
    }

    const url = '/transaction';

    try {
      const response = await this.retryPolicy(() =>
        this.axiosInstance.post<Api4003PortResponse>(url, { page }),
      );

      const { transactionList } = response.data;

      // 대문자 키를 소문자로 변환하여 Transaction 형식으로 매핑
      return transactionList.map((item) => ({
        amount: item.AMOUNT,
        balance: item.BALANCE,
        cancelYn: item.CANCEL_YN as 'Y' | 'N',
        date: item.DATE,
        storeId: item.STORE_ID,
        transactionId: item.TRANSACTION_ID,
      }));
    } catch (error) {
      this.logger.error('Port4003Fetcher.fetch error', error?.stack, {
        url: `http://localhost:4003${url}`,
        page,
        error: error?.message ?? error,
      });
      throw error;
    }
  }
}
