import { Provider } from '@nestjs/common';
import { TransactionFetcher } from '../type/transaction';
import { BatchLoggerService } from '../../log/batch-logger.service';
import { Port4001Fetcher } from './fetchers/port-4001-fetcher';
import { Port4002Fetcher } from './fetchers/port-4002-fetcher';
import { Port4003Fetcher } from './fetchers/port-4003-fetcher';
import { CsvTransactionFetcher } from './fetchers/csv-transaction-fetcher';
import * as path from 'path';

/**
 * @description Fetcher 정의 인터페이스
 *
 * 각 데이터 소스의 메타데이터와 실제 Fetcher 인스턴스를 포함함
 * 새로운 데이터 소스를 추가할 때 이 인터페이스를 구현하면 됨
 */
export interface FetcherDefinition {
  /** 데이터 소스 식별자 (로깅, 모니터링에 사용) */
  name: string;

  /** 실제 데이터를 가져오는 Fetcher 인스턴스 */
  fetcher: TransactionFetcher;

  /** 활성화 여부 (비활성화된 소스는 수집에서 제외) */
  enabled?: boolean;

  /** 실행 우선순위 (낮을수록 먼저 실행) */
  priority?: number;
}

/**
 * @description DI 토큰
 *
 * NestJS에서 FetcherDefinition 배열을 주입받을 때 사용하는 토큰
 * Symbol을 사용하여 다른 Provider와 충돌을 방지하기 위함
 */
export const TRANSACTION_FETCHERS = Symbol('TRANSACTION_FETCHERS');

/**
 * @description 기본 CSV 파일 경로
 */
const DEFAULT_CSV_PATH = path.join(
  process.cwd(),
  'data-source',
  'transaction.csv',
);

/**
 * @description TransactionFetcher Provider
 *
 * 모든 데이터 소스의 Fetcher를 생성하고 DI 컨테이너에 등록함
 *
 * 확장 방법:
 * 1. 새로운 Fetcher 클래스 생성 (TransactionFetcher 인터페이스 구현)
 * 2. 이 파일의 useFactory에 FetcherDefinition 추가
 * 3. 완료 (BatchService 수정 불필요)
 *
 * @example
 * // 새로운 Kafka 소스 추가 예시
 * {
 *   name: 'Kafka',
 *   fetcher: new KafkaTransactionFetcher(kafkaConfig, logger),
 *   enabled: true,
 *   priority: 5,
 * }
 */
export const TransactionFetchersProvider: Provider = {
  provide: TRANSACTION_FETCHERS,
  useFactory: (logger: BatchLoggerService): FetcherDefinition[] => {
    const fetchers: FetcherDefinition[] = [
      {
        name: 'Port 4001',
        fetcher: new Port4001Fetcher(logger),
        enabled: true,
        priority: 1,
      },
      {
        name: 'Port 4002',
        fetcher: new Port4002Fetcher(logger),
        enabled: true,
        priority: 2,
      },
      {
        name: 'Port 4003',
        fetcher: new Port4003Fetcher(logger),
        enabled: true,
        priority: 3,
      },
      {
        name: 'CSV',
        fetcher: new CsvTransactionFetcher(DEFAULT_CSV_PATH, logger),
        enabled: true,
        priority: 4,
      },
    ];

    // 활성화된 Fetcher만 필터링하고 우선순위로 정렬
    return fetchers
      .filter((f) => f.enabled !== false)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  },
  inject: [BatchLoggerService],
};
