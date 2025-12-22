import { Injectable, Inject, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BatchLoggerService } from '../log/batch-logger.service';
import { TransactionCollectionService } from './services/transaction-collection.service';
import { MergeTransactionService } from './services/merge-transaction.service';
import { BatchRepositoryService } from './services/batch-repository.service';
import { TaskManagerService } from '../common/concurrency/task-manager.service';
import { Sequential, Parallel } from '../common/concurrency/decorators';
import { ResourceGroup } from '../common/concurrency/types/task.types';
import {
  FetcherDefinition,
  TRANSACTION_FETCHERS,
} from './data-source/fetcher.provider';

/**
 * @description 배치 작업 메인 서비스
 * - 각 Service를 조율
 * - 전체 흐름 제어
 * - 에러 처리
 *
 * 개선사항:
 * - DI를 통해 FetcherDefinition[] 주입받음 (확장성 확보)
 * - 상세한 에러 로깅 추가
 */
@Injectable()
export class BatchService implements OnApplicationBootstrap {
  constructor(
    private readonly logger: BatchLoggerService,
    private readonly collectionService: TransactionCollectionService,
    private readonly mergeService: MergeTransactionService,
    private readonly repositoryService: BatchRepositoryService,
    private readonly taskManager: TaskManagerService,

    // DI로 Fetcher 정의 주입받음 (확장성 확보)
    @Inject(TRANSACTION_FETCHERS)
    private readonly fetcherDefinitions: FetcherDefinition[],
  ) { }

  /**
   * @description 10분마다 실행
   * 배치 작업은 순차 처리
   */
  @Cron('0 */10 * * * *')
  @Sequential(ResourceGroup.BATCH_JOB, {
    taskName: 'BatchJob',
    maxWaitTime: 600000, // 10분
  })
  async run(): Promise<void> {
    const startTime = Date.now();
    const batchId = `batch-${Date.now()}`;

    console.log(`\n[${batchId}] ========== 배치 작업 시작 ==========`);
    this.logger.log('========== 배치 작업 시작 ==========');

    try {
      // Transaction 수집
      console.log(`[${batchId}] [Step 1/4] Transaction 수집 시작...`);
      const allTransactions = await this.collectTransactions(batchId);
      console.log(
        `[${batchId}] [Step 1/4] Transaction 수집 완료: ${allTransactions.length}개`,
      );

      // 중복 제거
      console.log(`[${batchId}] [Step 2/4] 중복 제거 시작...`);
      const { newTransactions, duplicateCount } = await this.removeDuplicates(
        allTransactions,
        batchId,
      );
      console.log(
        `[${batchId}] [Step 2/4] 중복 제거 완료: 신규 ${newTransactions.length}개, 중복 ${duplicateCount}개`,
      );

      if (newTransactions.length === 0) {
        console.log(`[${batchId}] 처리할 새로운 데이터가 없습니다.`);
        this.logger.log('처리할 새로운 데이터가 없습니다.');
        return;
      }

      // MergeTransaction 생성
      console.log(`[${batchId}] [Step 3/4] MergeTransaction 생성 시작...`);
      const { successful, failed } =
        await this.mergeService.createMergeTransactions(newTransactions);
      console.log(
        `[${batchId}] [Step 3/4] MergeTransaction 생성 완료: 성공 ${successful.length}개, 실패 ${failed.length}개`,
      );

      // 실패한 항목 로깅
      if (failed.length > 0) {
        console.log(`[${batchId}] [Step 3/4] 실패한 Transaction 목록:`);
        failed.forEach((f, idx) => {
          console.log(
            `[${batchId}]   ${idx + 1}. transactionId: ${f.transactionId
            }, 사유: ${f.reason}`,
          );
        });
      }

      // 결과 저장
      if (successful.length > 0) {
        console.log(`[${batchId}] [Step 4/4] 결과 저장 시작...`);
        await this.saveResults(successful, batchId);
        console.log(
          `[${batchId}] [Step 4/4] 결과 저장 완료: ${successful.length}개`,
        );
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
      const duration = Date.now() - startTime;

      // 상세 에러 정보 출력
      console.error(`\n[${batchId}] ========== 배치 작업 실패 ==========`);
      console.error(`[${batchId}] 에러 발생 시간: ${new Date().toISOString()}`);
      console.error(`[${batchId}] 에러 메시지: ${error.message}`);
      console.error(`[${batchId}] 에러 이름: ${error.name}`);
      console.error(`[${batchId}] 스택 트레이스:`);
      console.error(error.stack);

      this.logger.error('배치 작업 실패', error.stack, {
        batchId,
        error: error.message,
        duration: `${duration}ms`,
      });

      throw error;
    } finally {
      console.log(`[${batchId}] ========== 배치 작업 종료 ==========\n`);
      this.logger.log('========== 배치 작업 종료 ==========\n');
    }
  }

  onApplicationBootstrap(): void {
    this.run();
  }

  /**
   * @description 모든 소스에서 데이터 수집
   *
   * 개선사항:
   * - Factory 직접 호출 제거
   * - 주입받은 fetcherDefinitions 사용 (확장성 확보)
   * - 각 소스별 상세 로깅
   */
  @Parallel(ResourceGroup.DATA_COLLECTION, {
    taskName: 'CollectTransactions',
  })
  private async collectTransactions(batchId: string) {
    // DI로 주입받은 Fetcher 정의를 사용
    const sources = this.fetcherDefinitions.map((def) => ({
      fetcher: def.fetcher,
      name: def.name,
    }));

    console.log(
      `[${batchId}] 등록된 데이터 소스: ${sources
        .map((s) => s.name)
        .join(', ')}`,
    );
    this.logger.log(
      `[${batchId}] 등록된 데이터 소스: ${sources
        .map((s) => s.name)
        .join(', ')}`,
    );

    const allTransactions =
      await this.collectionService.fetchFromMultipleSources(sources);

    this.logger.log(`총 ${allTransactions.length}개 수집 완료`);
    return allTransactions;
  }

  /**
   * @description 중복 제거
   */
  private async removeDuplicates(transactions: any[], batchId: string) {
    try {
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
    } catch (error) {
      console.error(`[${batchId}] [removeDuplicates] 중복 제거 중 에러 발생:`);
      console.error(`[${batchId}] [removeDuplicates] 에러: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }

  /**
   * @description 결과 저장
   * 파일 쓰기는 순차 처리
   */
  @Sequential(ResourceGroup.FILE_WRITE, {
    taskName: 'SaveResults',
  })
  private async saveResults(mergeTransactions: any[], batchId: string) {
    try {
      // MergeTransaction 저장
      await this.repositoryService.saveMergeTransactions(mergeTransactions);

      // 처리된 ID 저장
      const ids = mergeTransactions.map((tx) => tx.transactionId);
      await this.repositoryService.saveProcessedIds(ids);

      this.logger.log(`${mergeTransactions.length}개 저장 완료`);
    } catch (error) {
      console.error(`[${batchId}] [saveResults] 결과 저장 중 에러 발생:`);
      console.error(`[${batchId}] [saveResults] 에러: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }
}
