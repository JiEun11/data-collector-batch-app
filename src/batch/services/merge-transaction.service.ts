import { Injectable } from '@nestjs/common';
import { Transaction } from '../type/transaction';
import { StoreTransaction } from '../type/store-transaction';
import { MergeTransaction } from '../type/merge-transaction';
import { StoreTransactionFetcher } from '../data-source/store-transaction-fetcher';
import { createMergeTransaction } from '../domain/createMergeTransaction';
import { BatchLoggerService } from '../../log/batch-logger.service';

/**
 * @description MergeTransaction 생성을 담당하는 서비스
 * - Transaction과 StoreTransaction 병합
 * - StoreTransaction 조회 (캐싱 적용)
 * - 성공/실패 추적
 */
@Injectable()
export class MergeTransactionService {
  // StoreTransaction 캐시 ${storeId}:${date}
  private storeTransactionCache: Map<string, StoreTransaction[]> = new Map();

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
    const total = transactions.length;

    // 캐시 초기화 (배치 시작 시)
    this.storeTransactionCache.clear();
    console.log(
      `[MergeTransactionService] 총 ${total}개의 Transaction 처리 시작`,
    );

    const uniqueKeys = this.extractUniqueStoreKeys(transactions);
    console.log(
      `[MergeTransaction] 유니크한 storeId+date 조합: ${uniqueKeys.size}개`,
    );
    await this.prefetchStoreTransactions(uniqueKeys);
    console.log(
      `[MergeTransaction] 프리페치 완료, 캐시 크기: ${this.storeTransactionCache.size}`,
    );

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      try {
        const storeTx = this.findFromCache(
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
    console.log('[MergeTransactionService] 처리 완료');
    console.log(`[MergeTransaction] 처리 완료!`);
    console.log(`[MergeTransaction] - 성공: ${successful.length}개`);
    console.log(`[MergeTransaction] - 실패: ${failed.length}개`);
    this.logger.log('MergeTransaction 생성 완료', {
      total: transactions.length,
      success: successful.length,
      failed: failed.length,
    });

    return { successful, failed };
  }

  /**
   * @description 유니크한 storeId+date 조합 추출
   */
  private extractUniqueStoreKeys(transactions: Transaction[]): Set<string> {
    const keys = new Set<string>();
    for (const tx of transactions) {
      keys.add(`${tx.storeId}:${tx.date}`);
    }
    return keys;
  }

  /**
   * @description 병렬로 StoreTransaction 프리페치
   */
  private async prefetchStoreTransactions(
    uniqueKeys: Set<string>,
  ): Promise<void> {
    const keysArray = Array.from(uniqueKeys);
    const BATCH_SIZE = 10; // 동시에 10개씩 병렬 처리

    console.log(
      `[MergeTransaction] 프리페치 시작: ${keysArray.length}개 조합을 ${BATCH_SIZE}개씩 병렬 처리`,
    );

    for (let i = 0; i < keysArray.length; i += BATCH_SIZE) {
      const batch = keysArray.slice(i, i + BATCH_SIZE);

      // 진행 상황 출력
      if (i % 100 === 0) {
        console.log(
          `[MergeTransaction] 프리페치 진행 중: ${i}/${keysArray.length
          } (${Math.round((i / keysArray.length) * 100)}%)`,
        );
      }

      // 병렬로 API 호출
      await Promise.all(
        batch.map(async (key) => {
          const [storeId, date] = key.split(':');
          try {
            const data = await this.fetchAllStoreTransactions(storeId, date);
            this.storeTransactionCache.set(key, data);
          } catch (error) {
            // 실패해도 빈 배열로 캐시 (재시도 방지)
            this.storeTransactionCache.set(key, []);
          }
        }),
      );
    }
  }

  /**
   * @description 캐시에서 StoreTransaction 찾기 (API 호출 없음)
   */
  private findFromCache(
    storeId: string,
    date: string,
    transactionId: string,
  ): StoreTransaction | null {
    const cacheKey = `${storeId}:${date}`;
    const cached = this.storeTransactionCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    return cached.find((st) => st.transactionId === transactionId) || null;
  }

  /**
   * @description 특정 storeId + date의 모든 StoreTransaction 조회 (모든 페이지)
   */
  private async fetchAllStoreTransactions(
    storeId: string,
    date: string,
  ): Promise<StoreTransaction[]> {
    const allData: StoreTransaction[] = [];
    let page = 1;
    const maxPages = 100;

    while (page <= maxPages) {
      try {
        const pageData = await this.storeTransactionFetcher.fetch(
          storeId,
          date,
          page,
        );

        if (pageData.length === 0) {
          break;
        }

        allData.push(...pageData);
        page++;
      } catch (error) {
        break;
      }
    }

    return allData;
  }
}
