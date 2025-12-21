import axios, { AxiosInstance } from 'axios';
import { StoreTransaction } from '../type/store-transaction';
import { BatchLogger } from '../../log/type/batch-logger';
import { Api4596PortResponse } from 'data-source/type/ApiResponse';

export class StoreTransactionFetcher {
  private axiosInstance: AxiosInstance;

  constructor(
    private readonly baseUrl: string,
    private readonly logger: BatchLogger,
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 2000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetch(
    storeId: string,
    date: string,
    page: number,
  ): Promise<StoreTransaction[]> {
    const url = `/store-transaction/${storeId}`;

    try {
      this.logger.log(`StoreTransactionFetcher fetch start`);
      const response = await this.axiosInstance.post<Api4596PortResponse>(url, {
        page,
        date,
      });

      const { list } = response.data;

      return list.map((item) => ({
        storeId: item.storeId,
        transactionId: item.transactionId,
        productId: item.productId,
        date,
      }));
    } catch (error) {
      this.logger.error('StoreTransactionFetcher.fetch error', error?.stack, {
        url: `${this.baseUrl}${url}`,
        storeId,
        date,
        page,
        error: error?.message ?? error,
      });
      throw error;
    }
  }
}
