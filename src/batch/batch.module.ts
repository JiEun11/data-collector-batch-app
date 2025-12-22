import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RepositoryModule } from '../database/repository.module';
import { LogModule } from '../log/log.module';

import { BatchService } from './batch.service';
import { TransactionCollectionService } from './services/transaction-collection.service';
import { MergeTransactionService } from './services/merge-transaction.service';
import { BatchRepositoryService } from './services/batch-repository.service';

import { StoreTransactionFetcher } from './data-source/store-transaction-fetcher';

/**
 * @description 배치 모듈
 * - BatchService: 메인 서비스
 * - TransactionCollectionService: 데이터 수집
 * - MergeTransactionService: 데이터 병합 (Transaction정보와 StoreTransaction정보를 합침)
 * - BatchRepositoryService: 데이터 저장
 */
@Module({
  imports: [ScheduleModule.forRoot(), RepositoryModule, LogModule],
  providers: [
    // Main Service
    BatchService,

    // Domain Services
    TransactionCollectionService,
    MergeTransactionService,
    BatchRepositoryService,

    // Data Source
    {
      provide: StoreTransactionFetcher,
      useFactory: (logger) => {
        return new StoreTransactionFetcher('http://localhost:4596', logger);
      },
      inject: ['BatchLoggerService'],
    },
  ],
})
export class BatchModule { }
