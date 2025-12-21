import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { Transaction, TransactionFetcher } from '../type/transaction';
import { createRetryPolicy } from '../../common/utils/retry';
import { BatchLogger } from '../../log/type/batch-logger';

export class HttpTransactionFetcher implements TransactionFetcher {
  private axiosInstance: AxiosInstance;
  private retryPolicy: (fn: () => Promise<any>) => Promise<any>;

  constructor(
    private baseUrl: string,
    maxRetries: number,
    private logger: BatchLogger,
  ) {
    this.axiosInstance = axios.create({ baseURL: this.baseUrl, timeout: 2000 });
    this.retryPolicy = createRetryPolicy(maxRetries, 200);
  }

  async fetch(page: number): Promise<Transaction[]> {
    if (!Number.isInteger(page) || page < 1) {
      throw { response: { status: 400, data: 'page must be integer >= 1' } };
    }

    const url = `/transactions?page=${page}`;
    try {
      const response = await this.retryPolicy(() =>
        this.axiosInstance.get(url),
      );

      const body = response.data;
      return body.data ?? [];
    } catch (error) {
      this.logger.error('HTTPTransactionFetcher.fetch error', error?.stack, {
        url: `${this.baseUrl}${url}`,
        page,
        error: error?.message ?? error,
      });
      throw error;
    }
  }
}
