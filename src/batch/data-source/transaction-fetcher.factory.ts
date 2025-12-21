import { TransactionFetcher } from '../type/transaction';
import { CsvTransactionFetcher } from './csv-transaction-fetcher';
import { Port4001Fetcher } from './fetchers/port-4001-fetcher';
import { Port4002Fetcher } from './fetchers/port-4002-fetcher';
import { Port4003Fetcher } from './fetchers/port-4003-fetcher';
import { BatchLogger } from '../../log/type/batch-logger';

/**
 * @description Transaction을 가져오는 Fetcher들을 생성하는 팩토리
 *
 * 각 포트별 특징:
 * - 4001: GET 요청, JSON 응답, 1번 재시도
 * - 4002: GET 요청, XML 응답, 2번 재시도
 * - 4003: POST 요청, JSON 응답, 3번 재시도
 * - CSV: 파일 시스템 (재시도 없음)
 */
export class TransactionFetcherFactory {
  /**
   * @description 모든 데이터 소스의 Fetcher를 한 번에 생성
   * @param csvFilePath CSV 파일 경로
   * @param logger 로거 인스턴스
   * @returns TransactionFetcher 배열 (4개)
   */
  static createAllFetchers(
    csvFilePath: string,
    logger: BatchLogger,
  ): TransactionFetcher[] {
    return [
      new Port4001Fetcher(logger),
      new Port4002Fetcher(logger),
      new Port4003Fetcher(logger),
      new CsvTransactionFetcher(csvFilePath, logger),
    ];
  }
}
