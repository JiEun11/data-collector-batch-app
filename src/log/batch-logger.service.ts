import { Injectable, Inject } from '@nestjs/common';
import { BatchLogger } from './type/batch-logger';
import { LogEntry, LogLevel } from './type/log-entry';
import { Repository } from '../database/repository';
import { JSON_REPOSITORY } from '../database/repository.module';
import { ApiResponse, ApiResponseCode } from '../common/types/api-response';
import { BatchException } from '../common/exceptions/batch-exception';

@Injectable()
export class BatchLoggerService implements BatchLogger {
  private readonly LOG_KEY = 'batch_logs';
  private logBuffer: LogEntry[] = [];
  private isFlushing = false;

  constructor(
    @Inject(JSON_REPOSITORY)
    private readonly repository: Repository<LogEntry[]>,
  ) { }

  // 에러 로깅
  error(message: string, stack?: string, context?: any): void {
    const entry = this.createLogEntry('ERROR', message, stack, context);
    this.addLog(entry);
  }

  // BatchException 에러 로깅
  logBatchException(exception: BatchException): void {
    const errorResponse = exception.toErrorResponse();

    const entry = this.createLogEntry(
      'ERROR',
      errorResponse.systemMessage,
      errorResponse.stack,
      {
        code: errorResponse.code,
        clientMessage: errorResponse.clientMessage,
        context: errorResponse.context,
      },
    );
    this.addLog(entry);
  }

  // 성공 로깅
  logSuccess<T>(message: string, data?: T, context?: any): void {
    const successResponse: ApiResponse<T> = {
      code: ApiResponseCode.SUCCESS,
      clientMessage: message,
      systemMessage: message,
      data,
      timestamp: new Date().toISOString(),
    };

    const entry = this.createLogEntry('LOG', message, undefined, {
      response: successResponse,
      ...context,
    });
    this.addLog(entry);
  }

  log(message: string, context?: any): void {
    const entry = this.createLogEntry('LOG', message, undefined, context);
    this.addLog(entry);
  }

  warn(message: string, context?: any): void {
    const entry = this.createLogEntry('WARN', message, undefined, context);
    this.addLog(entry);
  }

  debug(message: string, context?: any): void {
    const entry = this.createLogEntry('DEBUG', message, undefined, context);
    this.addLog(entry);
  }

  verbose(message: string, context?: any): void {
    const entry = this.createLogEntry('VERBOSE', message, undefined, context);
    this.addLog(entry);
  }

  /**
   * @description 로그 항목 생성
   * @param level 로그의 심각도
   * @param message 로그의 메세지
   * @param stack 에러의 원인 추적 정보
   * @param context 로그의 부가 메타 데이터
   * @returns
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    stack?: string,
    context?: any,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      stack,
      context,
    };
  }

  /**
   * @description 로그를 버퍼에 추가하고 비동기로 DB 저장
   * @param entry
   */
  private addLog(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // 버퍼가 너무 커지지 않도록 주기적으로 flush
    if (this.logBuffer.length >= 50 && !this.isFlushing) {
      this.flushLogs();
    }

    // 비동기로 저장 (동기 함수 내에서 실행)
    setImmediate(() => this.flushLogs());
  }

  /**
   * @description 버퍼에 쌓인 로그를 DB에 저장
   */
  private async flushLogs(): Promise<void> {
    if (this.isFlushing || this.logBuffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      const logsToSave = [...this.logBuffer];
      this.logBuffer = [];

      const existingLogs = (await this.repository.find(this.LOG_KEY)) || [];
      const updatedLogs = [...existingLogs, ...logsToSave];

      await this.repository.save(this.LOG_KEY, updatedLogs);
    } catch (error) {
      console.error('[Logger] Failed to flush logs:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * @description 애플리케이션 종료 시 남은 로그 저장
   */
  async onApplicationShutdown(): Promise<void> {
    if (this.logBuffer.length > 0) {
      await this.flushLogs();
    }
  }
}
