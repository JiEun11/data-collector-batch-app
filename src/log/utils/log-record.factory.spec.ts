import { LogRecordFactory } from './log-record.factory';
import { BatchException } from '../../common/exceptions/batch-exception';
import { ApiResponseCode } from '../../common/types/api-response';

describe('LogRecordFactory', () => {
  describe('create', () => {
    it('기본 LogRecord를 생성한다', () => {
      const record = LogRecordFactory.create('LOG', 'Test message');

      expect(record.level).toBe('LOG');
      expect(record.message).toBe('Test message');
      expect(record.timestamp).toBeDefined();
      expect(record.stack).toBeUndefined();
      expect(record.context).toBeUndefined();
    });

    it('stack과 context를 포함한 LogRecord를 생성한다', () => {
      const record = LogRecordFactory.create(
        'ERROR',
        'Error message',
        'Stack trace',
        { userId: 123 },
      );

      expect(record.level).toBe('ERROR');
      expect(record.message).toBe('Error message');
      expect(record.stack).toBe('Stack trace');
      expect(record.context).toEqual({ userId: 123 });
    });

    it('timestamp가 ISO 8601 형식이다', () => {
      const record = LogRecordFactory.create('LOG', 'Test');

      expect(record.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  describe('createError', () => {
    it('ERROR 레벨 LogRecord를 생성한다', () => {
      const record = LogRecordFactory.createError('Error occurred');

      expect(record.level).toBe('ERROR');
      expect(record.message).toBe('Error occurred');
    });

    it('stack trace를 포함할 수 있다', () => {
      const record = LogRecordFactory.createError(
        'Error occurred',
        'at line 10',
        { code: 500 },
      );

      expect(record.stack).toBe('at line 10');
      expect(record.context).toEqual({ code: 500 });
    });
  });

  describe('createLog', () => {
    it('LOG 레벨 LogRecord를 생성한다', () => {
      const record = LogRecordFactory.createLog('Info message');

      expect(record.level).toBe('LOG');
      expect(record.message).toBe('Info message');
      expect(record.stack).toBeUndefined();
    });
  });

  describe('createWarn', () => {
    it('WARN 레벨 LogRecord를 생성한다', () => {
      const record = LogRecordFactory.createWarn('Warning message');

      expect(record.level).toBe('WARN');
      expect(record.message).toBe('Warning message');
    });
  });

  describe('createDebug', () => {
    it('DEBUG 레벨 LogRecord를 생성한다', () => {
      const record = LogRecordFactory.createDebug('Debug info', {
        step: 1,
      });

      expect(record.level).toBe('DEBUG');
      expect(record.context).toEqual({ step: 1 });
    });
  });

  describe('createVerbose', () => {
    it('VERBOSE 레벨 LogRecord를 생성한다', () => {
      const record = LogRecordFactory.createVerbose('Verbose details');

      expect(record.level).toBe('VERBOSE');
      expect(record.message).toBe('Verbose details');
    });
  });

  describe('createFromBatchException', () => {
    it('BatchException으로부터 LogRecord를 생성한다', () => {
      const exception = new BatchException(
        ApiResponseCode.NETWORK_ERROR,
        '네트워크 오류',
        '[Network Error] Connection failed',
        { port: 4001 },
      );

      const record = LogRecordFactory.createFromBatchException(exception);

      expect(record.level).toBe('ERROR');
      expect(record.message).toBe('[Network Error] Connection failed');
      expect(record.context.code).toBe(ApiResponseCode.NETWORK_ERROR);
      expect(record.context.clientMessage).toBe('네트워크 오류');
      expect(record.context.context).toEqual({ port: 4001 });
      expect(record.stack).toBeDefined();
    });
  });

  describe('createSuccess', () => {
    it('성공 로그를 생성한다', () => {
      const record = LogRecordFactory.createSuccess('작업 완료', {
        count: 10,
      });

      expect(record.level).toBe('LOG');
      expect(record.message).toBe('작업 완료');
      expect(record.context.response.code).toBe(ApiResponseCode.SUCCESS);
      expect(record.context.response.data).toEqual({ count: 10 });
    });

    it('data 없이도 성공 로그를 생성한다', () => {
      const record = LogRecordFactory.createSuccess('작업 완료');

      expect(record.level).toBe('LOG');
      expect(record.context.response.code).toBe(ApiResponseCode.SUCCESS);
      expect(record.context.response.data).toBeUndefined();
    });

    it('추가 context를 포함할 수 있다', () => {
      const record = LogRecordFactory.createSuccess(
        '작업 완료',
        { count: 10 },
        { duration: 1000 },
      );

      expect(record.context.response.data).toEqual({ count: 10 });
      expect(record.context.duration).toBe(1000);
    });
  });
});
