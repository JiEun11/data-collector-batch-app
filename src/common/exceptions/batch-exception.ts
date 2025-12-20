import { ApiResponseCode, ErrorResponse } from '../types/api-response';

/**
 * @description 배치 도메인 커스텀 예외
 */
export class BatchException extends Error {
  constructor(
    public readonly code: ApiResponseCode,
    public readonly clientMessage: string,
    public readonly systemMessage: string,
    public readonly context?: any,
  ) {
    super(systemMessage);
    this.name = 'BatchException';

    // 스택 트레이스 유지
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * @description 에러 응답 객체 생성
   */
  toErrorResponse(): ErrorResponse {
    return {
      code: this.code,
      clientMessage: this.clientMessage,
      systemMessage: this.systemMessage,
      timestamp: new Date().toISOString(),
      stack: this.stack,
      context: this.context,
    };
  }
}
