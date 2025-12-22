import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TransactionFetcherFactory } from './data-source/transaction-fetcher.factory';
import { BatchLoggerService } from '../log/batch-logger.service';
import { TransactionCollectionService } from './services/transaction-collection.service';
import { MergeTransactionService } from './services/merge-transaction.service';
import { BatchRepositoryService } from './services/batch-repository.service';

/**
 * @description 배치 작업 메인 서비스
 * - 각 Service를 조율
 * - 전체 흐름 제어
 * - 에러 처리
 */
@Injectable()
export class BatchService implements OnApplicationBootstrap {
  private readonly CSV_FILE_PATH = '/data-source/transaction.csv';

  constructor(
    private readonly logger: BatchLoggerService,
    private readonly collectionService: TransactionCollectionService,
    private readonly mergeService: MergeTransactionService,
    private readonly repositoryService: BatchRepositoryService,
  ) {}

  /**
   * @description 10분마다 실행
   */
  @Cron('0 */10 * * * *')
  async run(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('========== 배치 작업 시작 ==========');

    try {
      // Transaction 수집
      const allTransactions = await this.collectTransactions();

      // 중복 제거
      const { newTransactions, duplicateCount } = await this.removeDuplicates(
        allTransactions,
      );

      if (newTransactions.length === 0) {
        this.logger.log('처리할 새로운 데이터가 없습니다.');
        return;
      }

      // MergeTransaction 생성
      const { successful, failed } =
        await this.mergeService.createMergeTransactions(newTransactions);

      // 결과 저장
      if (successful.length > 0) {
        await this.saveResults(successful);
      }

      // 결과 로깅
      const duration = Date.now() - startTime;
      this.logger.logSuccess('배치 작업 완료', {
        duration: `${duration}ms`,
        total: allTransactions.length,
        new: newTransactions.length,
        duplicate: duplicateCount,
        processed: successful.length,
        failed: failed.length,
      });
    } catch (error) {
      this.logger.error('배치 작업 실패', error.stack, {
        error: error.message,
      });

      console.error('배치 작업 실패:', error.message);
      console.error('스택 트레이스:', error.stack);

      throw error;
    } finally {
      this.logger.log('========== 배치 작업 종료 ==========\n');
    }
  }

  onApplicationBootstrap(): void {
    this.run();
  }

  /**
   * @description 모든 소스에서 데이터 수집
   */
  private async collectTransactions() {
    const fetchers = TransactionFetcherFactory.createAllFetchers(
      this.CSV_FILE_PATH,
      this.logger,
    );

    const sources = [
      { fetcher: fetchers[0], name: 'Port 4001' },
      { fetcher: fetchers[1], name: 'Port 4002' },
      { fetcher: fetchers[2], name: 'Port 4003' },
      { fetcher: fetchers[3], name: 'CSV' },
    ];

    const allTransactions =
      await this.collectionService.fetchFromMultipleSources(sources);

    this.logger.log(`총 ${allTransactions.length}개 수집 완료`);
    return allTransactions;
  }

  /**
   * @description 중복 제거
   */
  private async removeDuplicates(transactions: any[]) {
    const processedIds = await this.repositoryService.getProcessedIds();

    const result = this.repositoryService.filterDuplicates(
      transactions,
      processedIds,
    );

    this.logger.log('중복 제거 완료', {
      total: transactions.length,
      new: result.new.length,
      duplicate: result.duplicate.length,
    });

    return {
      newTransactions: result.new,
      duplicateCount: result.duplicate.length,
    };
  }

  /**
   * @description 결과 저장
   */
  private async saveResults(mergeTransactions: any[]) {
    // MergeTransaction 저장
    await this.repositoryService.saveMergeTransactions(mergeTransactions);

    // 처리된 ID 저장
    const ids = mergeTransactions.map((tx) => tx.transactionId);
    await this.repositoryService.saveProcessedIds(ids);

    this.logger.log(`${mergeTransactions.length}개 저장 완료`);
  }
}
