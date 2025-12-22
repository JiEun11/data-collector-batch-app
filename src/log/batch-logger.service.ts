import { Injectable, Inject } from '@nestjs/common';
import { BatchLogger } from './type/batch-logger';
import { Repository } from '../database/repository';
import { JSON_REPOSITORY } from '../database/repository.module';
import { LogRecordFactory } from './utils/log-record.factory';
import { LogBuffer } from './utils/log-buffer';
import { BatchException } from '../common/exceptions/batch-exception';
import { LogRecord } from './type/log-record';

/**
 * @description 배치 로거 서비스
 *
 * - 로그 인터페이스 제공 (error, log, warn, debug, verbose)
 * - LogRecordFactory와 LogBuffer를 조율
 *
 * 동작 흐름:
 * 1. 로그 메서드 호출 (e.g., logger.log('메시지'))
 * 2. LogRecordFactory로 LogRecord 생성
 * 3. LogBuffer에 추가
 * 4. LogBuffer가 자동으로 DB 저장 관리
 */
@Injectable()
export class BatchLoggerService implements BatchLogger {
  /**
   * @description 로그를 저장할 DB 키
   *
   * 용도: Repository에서 로그 데이터를 구분하는 키
   * 예시: batch-database.json 파일 내부
   * {
   *   "batch_logs": [...],         // 여기에 로그가 저장됨
   *   "merge_transactions": [...],
   *   "processed_transaction_ids": [...]
   * }
   */
  private readonly LOG_STORAGE_KEY = 'batch_logs';

  private logBuffer: LogBuffer;

  constructor(
    @Inject(JSON_REPOSITORY)
    private readonly repository: Repository<LogRecord[]>,
  ) {
    // LogBuffer 초기화
    this.logBuffer = new LogBuffer(this.repository, this.LOG_STORAGE_KEY);
  }

  /**
   * @description ERROR 레벨 로그
   */
  error(message: string, stack?: string, context?: any): void {
    const record = LogRecordFactory.createError(message, stack, context);
    this.logBuffer.add(record);
  }

  /**
   * @description BatchException 에러 로그
   */
  logBatchException(exception: BatchException): void {
    const record = LogRecordFactory.createFromBatchException(exception);
    this.logBuffer.add(record);
  }

  /**
   * @description 성공 로그 (SUCCESS 응답 포함)
   */
  logSuccess<T>(message: string, data?: T, context?: any): void {
    const record = LogRecordFactory.createSuccess(message, data, context);
    this.logBuffer.add(record);
  }

  /**
   * @description LOG 레벨 로그
   */
  log(message: string, context?: any): void {
    const record = LogRecordFactory.createLog(message, context);
    this.logBuffer.add(record);
  }

  /**
   * @description WARN 레벨 로그
   */
  warn(message: string, context?: any): void {
    const record = LogRecordFactory.createWarn(message, context);
    this.logBuffer.add(record);
  }

  /**
   * @description DEBUG 레벨 로그
   */
  debug(message: string, context?: any): void {
    const record = LogRecordFactory.createDebug(message, context);
    this.logBuffer.add(record);
  }

  /**
   * @description VERBOSE 레벨 로그
   */
  verbose(message: string, context?: any): void {
    const record = LogRecordFactory.createVerbose(message, context);
    this.logBuffer.add(record);
  }

  /**
   * @description 애플리케이션 종료 시 남은 로그 저장
   */
  async onApplicationShutdown(): Promise<void> {
    await this.logBuffer.flushAll();
  }
}
