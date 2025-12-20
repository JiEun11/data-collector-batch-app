import { BatchException } from './batch-exception';
import { ApiResponseCode } from '../types/api-response';

/**
 * @description 자주 사용하는 예외를 쉽게 생성하는 팩토리
 */
export class BatchExceptionFactory {
  /**
   * 네트워크 에러
   */
  static networkError(
    port: number,
    url: string,
    statusCode?: number,
  ): BatchException {
    return new BatchException(
      ApiResponseCode.NETWORK_ERROR,
      '일시적인 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      `[Network Error] Failed to connect to ${url} on port ${port}`,
      statusCode ? ` with status code ${statusCode}` : '',
    );
  }

  /**
   * Retry 실패
   */
  static retryExhausted(
    port: number,
    url: string,
    maxRetries: number,
  ): BatchException {
    return new BatchException(
      ApiResponseCode.RETRY_EXHAUSTED,
      '데이터를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      `[Retry Exhausted] Failed to fetch data from ${url} on port ${port} after ${maxRetries} attempts.`,
    );
  }

  /**
   * 데이터 소스 에러
   */
  static dataSourceError(sourceName: string, reason: string): BatchException {
    return new BatchException(
      ApiResponseCode.DATA_SOURCE_ERROR,
      '데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      `[Data Source Error] Error accessing data source ${sourceName}: ${reason}`,
    );
  }

  /**
   * StoreTransaction 조회 실패
   */
  static StoreTransactionNotFound(
    transactionId: string,
    storeId: string,
    date: string,
  ): BatchException {
    return new BatchException(
      ApiResponseCode.STORE_TRANSACTION_NOT_FOUND,
      '상점 거래 정보를 찾을 수 없습니다.',
      `[StoreTransaction Not Found] No StoreTransaction found for transactionId: ${transactionId}, storeId: ${storeId}, date: ${date}`,
    );
  }

  /**
   * Transaction 병합 실패
   */
  static transactionMergeFailed(
    transactionId: string,
    reason: string,
  ): BatchException {
    return new BatchException(
      ApiResponseCode.TRANSACTION_MERGE_FAILED,
      '거래 정보 병합 중 오류가 발생했습니다.',
      `[Transaction Merge Failed] Failed to merge transactionId: ${transactionId}. Reason: ${reason}`,
    );
  }

  /**
   * 데이터베이스 에러
   */
  static databaseError(operation: string, error: Error): BatchException {
    return new BatchException(
      ApiResponseCode.DATABASE_ERROR,
      '데이터 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      `[Database Error] Error during ${operation}: ${error.message}`,
    );
  }

  /**
   * 배치 실행 에러
   */
  static batchExecutionError(phase: string, error: Error): BatchException {
    return new BatchException(
      ApiResponseCode.BATCH_EXECUTION_ERROR,
      '배치 작업 중 오류가 발생했습니다.',
      `[Batch Execution Error] Error in phase ${phase}: ${error.message}`,
    );
  }
}
