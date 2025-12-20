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
    it('should store error log with stack and context', async () => {
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
  });

  /**
   * LOG 로그
   */
  describe('log()', () => {
    it('should store log entry', async () => {
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
  });

  /**
   * WARN 로그
   */
  describe('warn()', () => {
    it('should store warning log', async () => {
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
    it('should store debug log', async () => {
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
    it('should store verbose log', async () => {
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
   * DB persistence
   */
  describe('Database persistence', () => {
    it('should persist multiple logs together', async () => {
      service.log('Log 1');
      service.warn('Log 2');
      service.error('Log 3');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRepository.save).toHaveBeenCalled();

      const savedLogs = mockRepository.save.mock.calls[0][1];
      expect(savedLogs.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle database save failure gracefully', async () => {
      mockRepository.save.mockRejectedValueOnce(new Error('DB Error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.log('Test log');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Logger] Failed to flush logs:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  /**
   * Shutdown flush
   */
  describe('onApplicationShutdown()', () => {
    it('should flush remaining logs on shutdown', async () => {
      service.log('Final log');

      await service.onApplicationShutdown();

      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});
