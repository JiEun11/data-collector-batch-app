import { BatchException } from './batch-exception';
import { ApiResponseCode } from '../types/api-response';

describe('BatchException', () => {
  it('should create ErrorResponse correctly', () => {
    const exception = new BatchException(
      ApiResponseCode.NETWORK_ERROR,
      '네트워크 오류가 발생했습니다.',
      '[Network Error] Failed to connect to service',
      { port: 4001, url: '/test' },
    );

    const errorResponse = exception.toErrorResponse();
    expect(errorResponse).toEqual({
      code: ApiResponseCode.NETWORK_ERROR,
      clientMessage: '네트워크 오류가 발생했습니다.',
      systemMessage: '[Network Error] Failed to connect to service',
      context: { port: 4001, url: '/test' },
      stack: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should have correct error name', () => {
    const exception = new BatchException(
      ApiResponseCode.DATABASE_ERROR,
      '데이터 저장 실패',
      '[Database Error] Failed to save data',
    );

    expect(exception.name).toBe('BatchException');
    expect(exception.message).toBe('[Database Error] Failed to save data');
  });
});
