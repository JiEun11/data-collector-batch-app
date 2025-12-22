import { Injectable } from '@nestjs/common';
import { Transaction } from '../type/transaction';
import { MergeTransaction } from '../type/merge-transaction';
import { StoreTransactionFetcher } from '../data-source/store-transaction-fetcher';
import { createMergeTransaction } from '../domain/createMergeTransaction';
import { BatchLoggerService } from '../../log/batch-logger.service';

/**
 * @description MergeTransaction 생성을 담당하는 서비스
 * - Transaction과 StoreTransaction 병합
 * - StoreTransaction 조회
 * - 성공/실패 추적
 */
@Injectable()
export class MergeTransactionService {
  constructor(
    private readonly storeTransactionFetcher: StoreTransactionFetcher,
    private readonly logger: BatchLoggerService,
  ) { }

  /**
   * @description Transaction 리스트를 MergeTransaction으로 변환
   */
  async createMergeTransactions(transactions: Transaction[]): Promise<{
    successful: MergeTransaction[];
    failed: Array<{ transactionId: string; reason: string }>;
  }> {
    const successful: MergeTransaction[] = [];
    const failed: Array<{ transactionId: string; reason: string }> = [];

    for (const tx of transactions) {
      try {
        const storeTx = await this.findStoreTransaction(
          tx.storeId,
          tx.date,
          tx.transactionId,
        );

        if (!storeTx) {
          failed.push({
            transactionId: tx.transactionId,
            reason: 'StoreTransaction을 찾을 수 없음',
          });
          continue;
        }

        const mergeTx = createMergeTransaction(tx, storeTx);
        successful.push(mergeTx);
      } catch (error) {
        failed.push({
          transactionId: tx.transactionId,
          reason: error.message,
        });
      }
    }

    this.logger.log('MergeTransaction 생성 완료', {
      total: transactions.length,
      success: successful.length,
      failed: failed.length,
    });

    return { successful, failed };
  }

  /**
   * @description StoreTransaction 찾기 (페이징 처리)
   */
  private async findStoreTransaction(
    storeId: string,
    date: string,
    transactionId: string,
  ) {
    let page = 1;
    const maxPages = 100;

    while (page <= maxPages) {
      try {
        const storeTransactions = await this.storeTransactionFetcher.fetch(
          storeId,
          date,
          page,
        );

        if (storeTransactions.length === 0) {
          return null;
        }

        const found = storeTransactions.find(
          (st) => st.transactionId === transactionId,
        );

        if (found) {
          return found;
        }

        page++;
      } catch (error) {
        // 에러 발생 시 null 반환
        return null;
      }
    }

    return null;
  }
}
