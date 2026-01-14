import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RepositoryModule } from '../database/repository.module';
import { LogModule } from '../log/log.module';

import { BatchService } from './batch.service';
import { TransactionCollectionService } from './services/transaction-collection.service';
import { MergeTransactionService } from './services/merge-transaction.service';
import { BatchRepositoryService } from './services/batch-repository.service';
import { BatchLoggerService } from 'src/log/batch-logger.service';
import { StoreTransactionFetcher } from './data-source/fetchers/store-transaction-fetcher';
import {
  TransactionFetchersProvider,
  TRANSACTION_FETCHERS,
} from './data-source/fetcher.provider';
import { TaskManagerService } from '../common/concurrency/task-manager.service';

import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';

/**
 * @description 배치 모듈
 * - BatchService: 메인 서비스
 * - TransactionCollectionService: 데이터 수집
 * - MergeTransactionService: 데이터 병합 (Transaction정보와 StoreTransaction정보를 합침)
 * - BatchRepositoryService: 데이터 저장
 *
 * 확장성 개선:
 * - TransactionFetchersProvider를 통해 Fetcher들을 DI로 관리
 * - 새로운 데이터 소스 추가 시 fetcher.provider.ts만 수정하면 됨
 * FIXME: config 추가, 절대 경로 & 상대 경로 정리
 */
@Module({
  imports: [
    // FIXME: ConfigModule 추가
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(), 
    RepositoryModule, 
    LogModule
  ],
providers: [
    // Main Service
    BatchService,

    // Domain Services
    TransactionCollectionService,
    MergeTransactionService,
    BatchRepositoryService,

    // Task Manager (동시성 제어)
    TaskManagerService,

    // Transaction Fetchers (DI 기반 - 확장성 확보)
    TransactionFetchersProvider,

    // StoreTransaction Fetcher, FIXME: logger 타입 선언
    {
      provide: StoreTransactionFetcher,
      useFactory: (configService: ConfigService, logger: BatchLoggerService) => {
        const baseUrl = configService.get<string>('api.port4001.url');
        if (!baseUrl) {
          throw new Error('Store Transaction API baseUrl is not defined in configuration');
        }
        return new StoreTransactionFetcher(baseUrl, logger);
      },
      inject: [ConfigService, BatchLoggerService],  // ConfigService 주입
    },
  ],
  exports: [TRANSACTION_FETCHERS],
})
export class BatchModule { }
