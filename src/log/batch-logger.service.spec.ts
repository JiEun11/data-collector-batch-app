import { Test } from '@nestjs/testing';
import { BatchLoggerService } from './batch-logger.service';
import { JSON_REPOSITORY } from '../database/repository.module';

describe('BatchLoggerService', () => {
  let service: BatchLoggerService;
  let mockRepository: {
    find: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        BatchLoggerService,
        {
          provide: JSON_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BatchLoggerService>(BatchLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * ERROR 로그
   */
  describe('error()', () => {
    it('ERROR 레벨 로그를 저장한다', async () => {
      service.error('Test error', 'Stack trace', { userId: 123 });

      // 비동기 flush 대기
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalledWith(
        'batch_logs',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'ERROR',
            message: 'Test error',
            stack: 'Stack trace',
            context: { userId: 123 },
          }),
        ]),
      );
    });

    it('stack과 context가 선택적이다', async () => {
      service.error('Simple error');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalledWith(
        'batch_logs',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'ERROR',
            message: 'Simple error',
          }),
        ]),
      );
    });
  });

  /**
   * LOG 로그
   */
  describe('log()', () => {
    it('LOG 레벨 로그를 저장한다', async () => {
      service.log('Test log', { data: 'value' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalledWith(
        'batch_logs',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'LOG',
            message: 'Test log',
            context: { data: 'value' },
          }),
        ]),
      );
    });

    it('context 없이도 로그를 생성한다', async () => {
      service.log('Simple log');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalledWith(
        'batch_logs',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'LOG',
            message: 'Simple log',
          }),
        ]),
      );
    });
  });

  /**
   * WARN 로그
   */
  describe('warn()', () => {
    it('WARN 레벨 로그를 저장한다', async () => {
      service.warn('Test warning', { retry: 1 });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalledWith(
        'batch_logs',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'WARN',
            message: 'Test warning',
            context: { retry: 1 },
          }),
        ]),
      );
    });
  });

  /**
   * DEBUG 로그
   */
  describe('debug()', () => {
    it('DEBUG 레벨 로그를 저장한다', async () => {
      service.debug('Debug message', { foo: 'bar' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalledWith(
        'batch_logs',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'DEBUG',
            message: 'Debug message',
            context: { foo: 'bar' },
          }),
        ]),
      );
    });
  });

  /**
   * VERBOSE 로그
   */
  describe('verbose()', () => {
    it('VERBOSE 레벨 로그를 저장한다', async () => {
      service.verbose('Verbose message', { step: 3 });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalledWith(
        'batch_logs',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'VERBOSE',
            message: 'Verbose message',
            context: { step: 3 },
          }),
        ]),
      );
    });
  });

  /**
   * logSuccess
   */
  describe('logSuccess()', () => {
    it('성공 로그를 저장한다', async () => {
      service.logSuccess('작업 완료', { count: 10 });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalledWith(
        'batch_logs',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'LOG',
            message: '작업 완료',
            context: expect.objectContaining({
              response: expect.objectContaining({
                code: 'SUCCESS',
                data: { count: 10 },
              }),
            }),
          }),
        ]),
      );
    });
  });

  /**
   * DB persistence
   */
  describe('Database persistence', () => {
    it('여러 로그를 함께 저장한다', async () => {
      service.log('Log 1');
      service.warn('Log 2');
      service.error('Log 3');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalled();

      const savedLogs = mockRepository.save.mock.calls[0][1];
      expect(savedLogs.length).toBeGreaterThanOrEqual(3);
    });

    it('DB 저장 실패 시 gracefully 처리한다', async () => {
      mockRepository.save.mockRejectedValueOnce(new Error('DB Error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.log('Test log');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[LogBuffer] Failed to flush logs:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('기존 로그에 새 로그를 추가한다', async () => {
      const existingLogs = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          level: 'LOG',
          message: 'Old log',
        },
      ];

      mockRepository.find.mockResolvedValue(existingLogs);

      service.log('New log');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const savedLogs = mockRepository.save.mock.calls[0][1];
      expect(savedLogs.length).toBeGreaterThan(existingLogs.length);
      expect(savedLogs[0]).toEqual(existingLogs[0]);
    });
  });

  /**
   * Shutdown flush
   */
  describe('onApplicationShutdown()', () => {
    it('종료 시 남은 로그를 flush 한다', async () => {
      service.log('Final log');

      await service.onApplicationShutdown();

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('버퍼가 비어있으면 flush 하지 않는다', async () => {
      await service.onApplicationShutdown();

      // 초기 상태에서는 호출되지 않음
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  /**
   * Timestamp
   */
  describe('Timestamp', () => {
    it('모든 로그에 ISO 8601 형식의 timestamp를 추가한다', async () => {
      service.log('Test');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const savedLogs = mockRepository.save.mock.calls[0][1];
      const log = savedLogs[0];

      expect(log.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });
});
