import { Injectable, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TransactionFetcherFactory } from './data-source/transaction-fetcher.factory';
import { StoreTransactionFetcher } from './data-source/store-transaction-fetcher';
import { TransactionFetcher, Transaction } from './type/transaction';
import { MergeTransaction } from './type/merge-transaction';
import { createMergeTransaction } from './domain/createMergeTransaction';
import { BatchLoggerService } from '../log/batch-logger.service';
import { Repository } from '../database/repository';
import { JSON_REPOSITORY } from '../database/repository.module';

@Injectable()
export class BatchService implements OnApplicationBootstrap {
  private readonly CSV_FILE_PATH = './data-source/transaction.csv';
  private readonly MERGE_TX_KEY = 'merge_transactions';
  private readonly PROCESSED_TX_KEY = 'processed_transaction_ids';

  private transactionFetchers: TransactionFetcher[];
  private storeTransactionFetcher: StoreTransactionFetcher;

  constructor(
    private readonly logger: BatchLoggerService,
    @Inject(JSON_REPOSITORY)
    private readonly repository: Repository<any>,
  ) {
    // 모든 데이터 소스의 Fetcher 초기화
    this.transactionFetchers = TransactionFetcherFactory.createAllFetchers(
      this.CSV_FILE_PATH,
      this.logger,
    );

    // StoreTransactionFetcher 초기화
    this.storeTransactionFetcher = new StoreTransactionFetcher(
      'http://localhost:4596',
      this.logger,
    );
  }

  /**
   * @description 10분마다 실행되는 배치 작업
   */
  @Cron('0 */10 * * * *')
  async run() {
    const startTime = Date.now();
    this.logger.log('========== 배치 작업 시작 ==========');

    try {
      // 1단계: 모든 소스에서 Transaction 수집
      const allTransactions = await this.fetchAllTransactions();
      this.logger.log(`총 ${allTransactions.length}개의 Transaction 수집 완료`);

      // 2단계: 중복 제거
      const newTransactions = await this.filterDuplicates(allTransactions);
      this.logger.log(`중복 제거 후 ${newTransactions.length}개 처리 예정`);

      if (newTransactions.length === 0) {
        this.logger.log('처리할 새로운 Transaction이 없습니다.');
        return;
      }

      // 3단계: MergeTransaction 생성
      const mergeTransactions = await this.createMergeTransactions(
        newTransactions,
      );
      this.logger.log(
        `${mergeTransactions.length}개의 MergeTransaction 생성 완료`,
      );

      // 4단계: 데이터베이스에 저장
      await this.saveMergeTransactions(mergeTransactions);

      // 5단계: 처리된 Transaction ID 기록
      await this.markTransactionsAsProcessed(
        mergeTransactions.map((mt) => mt.transactionId),
      );

      const duration = Date.now() - startTime;
      this.logger.logSuccess(`배치 작업 완료 (${duration}ms)`, {
        totalTransactions: allTransactions.length,
        newTransactions: newTransactions.length,
        mergeTransactionsCreated: mergeTransactions.length,
        duration,
      });
    } catch (error) {
      this.logger.error('배치 작업 중 오류 발생', error.stack, {
        error: error.message,
      });

      // 콘솔에도 출력 (요구사항: 어떤 코드에서 오류가 발생했는지 유추 가능)
      console.error('❌ 배치 작업 실패:', error.message);
      console.error('📍 스택 트레이스:');
      console.error(error.stack);

      throw error;
    } finally {
      this.logger.log('========== 배치 작업 종료 ==========\n');
    }
  }

  /**
   * @description 애플리케이션 시작 시 즉시 배치 실행
   */
  onApplicationBootstrap() {
    this.run();
  }

  /**
   * @description 1단계: 모든 데이터 소스에서 Transaction 수집
   */
  private async fetchAllTransactions(): Promise<Transaction[]> {
    const allTransactions: Transaction[] = [];
    const sourceNames = ['Port 4001', 'Port 4002', 'Port 4003', 'CSV'];

    for (let i = 0; i < this.transactionFetchers.length; i++) {
      const fetcher = this.transactionFetchers[i];
      const sourceName = sourceNames[i];

      try {
        this.logger.log(`[${sourceName}] Transaction 수집 시작`);

        // 모든 페이지 데이터 가져오기
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          try {
            const transactions = await fetcher.fetch(page);

            if (transactions.length === 0) {
              hasMore = false;
              break;
            }

            allTransactions.push(...transactions);
            this.logger.log(
              `[${sourceName}] Page ${page}: ${transactions.length}개 수집`,
            );

            page++;
          } catch (error) {
            // 페이지가 더 이상 없는 경우 (404 또는 빈 응답)
            hasMore = false;
          }
        }

        this.logger.log(`[${sourceName}] 수집 완료`);
      } catch (error) {
        // 한 소스 실패해도 다른 소스는 계속 처리
        this.logger.error(
          `[${sourceName}] Transaction 수집 실패`,
          error.stack,
          { sourceName, error: error.message },
        );
        console.warn(`⚠️  [${sourceName}] 수집 실패, 다음 소스로 계속 진행`);
      }
    }

    return allTransactions;
  }

  /**
   * @description 2단계: 중복 Transaction 필터링
   * @param transactions 전체 Transaction 목록
   * @returns 중복 제거된 Transaction 목록
   */
  private async filterDuplicates(
    transactions: Transaction[],
  ): Promise<Transaction[]> {
    try {
      // 이미 처리된 Transaction ID 조회
      const processedIds: string[] =
        (await this.repository.find(this.PROCESSED_TX_KEY)) || [];

      // Set으로 변환하여 O(1) 조회 성능 확보
      const processedSet = new Set(processedIds);

      // 처리되지 않은 Transaction만 필터링
      return transactions.filter((tx) => !processedSet.has(tx.transactionId));
    } catch (error) {
      this.logger.error('중복 체크 중 오류 발생', error.stack, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @description 3단계: MergeTransaction 생성
   * @param transactions Transaction 목록
   * @returns MergeTransaction 목록
   */
  private async createMergeTransactions(
    transactions: Transaction[],
  ): Promise<MergeTransaction[]> {
    const mergeTransactions: MergeTransaction[] = [];
    const failedTransactionIds: string[] = [];

    for (const tx of transactions) {
      try {
        // StoreTransaction 조회
        const storeTx = await this.fetchStoreTransaction(
          tx.storeId,
          tx.date,
          tx.transactionId,
        );

        if (!storeTx) {
          this.logger.warn(
            `StoreTransaction을 찾을 수 없음: ${tx.transactionId}`,
            { transactionId: tx.transactionId, storeId: tx.storeId },
          );
          failedTransactionIds.push(tx.transactionId);
          continue;
        }

        // 기존 함수 사용: createMergeTransaction
        const mergeTx = createMergeTransaction(tx, storeTx);
        mergeTransactions.push(mergeTx);
      } catch (error) {
        this.logger.error(
          `MergeTransaction 생성 실패: ${tx.transactionId}`,
          error.stack,
          { transactionId: tx.transactionId },
        );
        failedTransactionIds.push(tx.transactionId);
      }
    }

    if (failedTransactionIds.length > 0) {
      this.logger.warn(
        `${failedTransactionIds.length}개의 Transaction 처리 실패`,
        { failedTransactionIds },
      );
    }

    return mergeTransactions;
  }

  /**
   * @description StoreTransaction 조회 (페이징 처리)
   * @param storeId store ID
   * @param date 날짜 (yyyy-MM-dd)
   * @param targetTransactionId 찾으려는 Transaction ID
   * @returns StoreTransaction 또는 null
   */
  private async fetchStoreTransaction(
    storeId: string,
    date: string,
    targetTransactionId: string,
  ) {
    let page = 1;
    const maxPages = 100; // 무한 루프 방지

    while (page <= maxPages) {
      try {
        const storeTransactions = await this.storeTransactionFetcher.fetch(
          storeId,
          date,
          page,
        );

        if (storeTransactions.length === 0) {
          break;
        }

        // 해당 transactionId 찾기
        const found = storeTransactions.find(
          (st) => st.transactionId === targetTransactionId,
        );

        if (found) {
          return found;
        }

        page++;
      } catch (error) {
        // 더 이상 페이지가 없거나 에러 발생
        break;
      }
    }

    return null;
  }

  /**
   * @description 4단계: MergeTransaction을 데이터베이스에 저장
   * @param mergeTransactions 저장할 MergeTransaction 목록
   */
  private async saveMergeTransactions(
    mergeTransactions: MergeTransaction[],
  ): Promise<void> {
    try {
      // 기존 데이터 조회
      const existing: MergeTransaction[] =
        (await this.repository.find(this.MERGE_TX_KEY)) || [];

      // 새 데이터 추가
      const updated = [...existing, ...mergeTransactions];

      // 저장
      await this.repository.save(this.MERGE_TX_KEY, updated);

      this.logger.log(
        `${mergeTransactions.length}개의 MergeTransaction 저장 완료`,
      );
    } catch (error) {
      this.logger.error('MergeTransaction 저장 실패', error.stack, {
        count: mergeTransactions.length,
      });
      throw error;
    }
  }

  /**
   * @description 5단계: 처리된 Transaction ID 기록 (중복 방지용)
   * @param transactionIds 처리된 Transaction ID 목록
   */
  private async markTransactionsAsProcessed(
    transactionIds: string[],
  ): Promise<void> {
    try {
      // 기존 처리된 ID 조회
      const existing: string[] =
        (await this.repository.find(this.PROCESSED_TX_KEY)) || [];

      // 중복 제거 후 합치기
      const updated = [...new Set([...existing, ...transactionIds])];

      // 저장
      await this.repository.save(this.PROCESSED_TX_KEY, updated);

      this.logger.log(`${transactionIds.length}개의 Transaction ID 기록 완료`);
    } catch (error) {
      this.logger.error('Transaction ID 기록 실패', error.stack, {
        count: transactionIds.length,
      });
      throw error;
    }
  }
}
