import axios, { AxiosInstance } from 'axios';
import { Transaction, TransactionFetcher } from '../../type/transaction';
import { createRetryPolicy } from '../../../common/utils/retry';
import { BatchLogger } from '../../../log/type/batch-logger';
import { Api4001PortResponse } from '../../../../data-source/type/ApiResponse';

/**
 * @description 4001 포트에서 Transaction을 가져오는 Fetcher
 * - HTTP Method: GET
 * - 응답 형식: JSON
 * - Retry 횟수: 1번
 */
export class Port4001Fetcher implements TransactionFetcher {
  private axiosInstance: AxiosInstance;
  private retryPolicy: (fn: () => Promise<any>) => Promise<any>;

  constructor(private logger: BatchLogger) {
    this.axiosInstance = axios.create({
      baseURL: 'http://localhost:4001',
      timeout: 2000,
    });
    this.retryPolicy = createRetryPolicy(1, 200); // 1번 재시도
  }

  async fetch(page: number): Promise<Transaction[]> {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error('page must be integer >= 1');
    }

    const url = `/transaction?page=${page}`;

    try {
      const response = await this.retryPolicy(() =>
        this.axiosInstance.get<Api4001PortResponse>(url),
      );

      const { list } = response.data;

      // API 응답 형식을 Transaction 형식으로 변환
      return list.map((item) => ({
        amount: item.amount,
        balance: item.balance,
        cancelYn: item.cancelYn as 'Y' | 'N',
        date: item.date,
        storeId: item.storeId,
        transactionId: item.transactionId,
      }));
    } catch (error) {
      this.logger.error('Port4001Fetcher.fetch error', error?.stack, {
        url: `http://localhost:4001${url}`,
        page,
        error: error?.message ?? error,
      });
      throw error;
    }
  }
}
