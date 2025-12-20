/**
 * @description 표준 API 응답 코드
 */
export enum ApiResponseCode {
  // 성공
  SUCCESS = 'SUCCESS',

  // 클라이언트 에러 (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',

  // 서버 에러 (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // 배치 관련 에러
  BATCH_EXECUTION_ERROR = 'BATCH_EXECUTION_ERROR',
  DATA_SOURCE_ERROR = 'DATA_SOURCE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',

  // 비지니스 로직 에러
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  STORE_TRANSACTION_NOT_FOUND = 'STORE_TRANSACTION_NOT_FOUND',
  TRANSACTION_MERGE_FAILED = 'TRANSACTION_MERGE_FAILED',
}

/**
 * @description 표준 API 응답 인터페이스
 */
export interface ApiResponse<T = any> {
  code: ApiResponseCode;
  clientMessage: string;
  systemMessage: string;
  data?: T;
  timestamp?: string;
  path?: string;
}

/**
 * @description 에러 응답 (data 필드 제외)
 */
export interface ErrorResponse extends Omit<ApiResponse, 'data'> {
  stack?: string;
  context?: any;
}
