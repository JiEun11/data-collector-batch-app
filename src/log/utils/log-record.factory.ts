import { LogRecord, LogLevel } from '../type/log-record';
import { BatchException } from '../../common/exceptions/batch-exception';
import { ApiResponse, ApiResponseCode } from '../../common/types/api-response';

/**
 * @description LogRecord 생성을 담당하는 팩토리 클래스
 * - LogRecord 객체 생성
 * - 타임스탬프 자동 추가
 * - 다양한 타입의 로그 생성
 */
export class LogRecordFactory {
  /**
   * @description 기본 로그 항목 생성
   * @param level 로그의 심각도
   * @param message 로그의 메세지
   * @param stack 에러의 원인 추적 정보
   * @param context 로그의 부가 메타 데이터
   */
  static create(
    level: LogLevel,
    message: string,
    stack?: string,
    context?: any,
  ): LogRecord {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      stack,
      context,
    };
  }

  /**
   * @description ERROR 레벨 로그 생성
   */
  static createError(
    message: string,
    stack?: string,
    context?: any,
  ): LogRecord {
    return this.create('ERROR', message, stack, context);
  }

  /**
   * @description LOG 레벨 로그 생성
   */
  static createLog(message: string, context?: any): LogRecord {
    return this.create('LOG', message, undefined, context);
  }

  /**
   * @description WARN 레벨 로그 생성
   */
  static createWarn(message: string, context?: any): LogRecord {
    return this.create('WARN', message, undefined, context);
  }

  /**
   * @description DEBUG 레벨 로그 생성
   */
  static createDebug(message: string, context?: any): LogRecord {
    return this.create('DEBUG', message, undefined, context);
  }

  /**
   * @description VERBOSE 레벨 로그 생성
   */
  static createVerbose(message: string, context?: any): LogRecord {
    return this.create('VERBOSE', message, undefined, context);
  }

  /**
   * @description BatchException으로부터 로그 생성
   */
  static createFromBatchException(exception: BatchException): LogRecord {
    const errorResponse = exception.toErrorResponse();

    return this.createError(errorResponse.systemMessage, errorResponse.stack, {
      code: errorResponse.code,
      clientMessage: errorResponse.clientMessage,
      context: errorResponse.context,
    });
  }

  /**
   * @description 성공 응답 로그 생성
   */
  static createSuccess<T>(message: string, data?: T, context?: any): LogRecord {
    const successResponse: ApiResponse<T> = {
      code: ApiResponseCode.SUCCESS,
      clientMessage: message,
      systemMessage: message,
      data,
      timestamp: new Date().toISOString(),
    };

    return this.createLog(message, {
      response: successResponse,
      ...context,
    });
  }
}
