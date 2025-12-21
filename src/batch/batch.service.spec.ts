import { Test, TestingModule } from '@nestjs/testing';
import { BatchService } from './batch.service';
import { BatchLoggerService } from '../log/batch-logger.service';
import { JSON_REPOSITORY } from '../database/repository.module';
import { Transaction } from './type/transaction';
import { MergeTransaction } from './type/merge-transaction';

describe('BatchService 단위 테스트', () => {
  let service: BatchService;
  let mockLogger: jest.Mocked<BatchLoggerService>;
  let mockRepository: any;

  beforeEach(async () => {
    // Logger Mock
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      logSuccess: jest.fn(),
      logBatchException: jest.fn(),
    } as any;

    // Repository Mock
    mockRepository = {
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchService,
        {
          provide: BatchLoggerService,
          useValue: mockLogger,
        },
        {
          provide: JSON_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BatchService>(BatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 테스트 1: 중복 제거
   */
  describe('filterDuplicates', () => {
    it('이미 처리된 Transaction은 필터링되어야 한다', async () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'tx-1',
          storeId: 'store-1',
          date: '2021-01-01',
          amount: 1000,
          balance: 500,
          cancelYn: 'N',
        },
        {
          transactionId: 'tx-2',
          storeId: 'store-2',
          date: '2021-01-02',
          amount: 2000,
          balance: 600,
          cancelYn: 'N',
        },
      ];

      // tx-1은 이미 처리됨
      mockRepository.find.mockResolvedValue(['tx-1']);

      const result = await service['filterDuplicates'](transactions);

      expect(result).toHaveLength(1);
      expect(result[0].transactionId).toBe('tx-2');
    });

    it('모든 Transaction이 새로운 경우 전체 반환', async () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'tx-1',
          storeId: 'store-1',
          date: '2021-01-01',
          amount: 1000,
          balance: 500,
          cancelYn: 'N',
        },
      ];

      mockRepository.find.mockResolvedValue([]);

      const result = await service['filterDuplicates'](transactions);

      expect(result).toHaveLength(1);
    });

    it('모든 Transaction이 중복인 경우 빈 배열 반환', async () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'tx-1',
          storeId: 'store-1',
          date: '2021-01-01',
          amount: 1000,
          balance: 500,
          cancelYn: 'N',
        },
      ];

      mockRepository.find.mockResolvedValue(['tx-1']);

      const result = await service['filterDuplicates'](transactions);

      expect(result).toHaveLength(0);
    });
  });

  /**
   * 테스트 2: MergeTransaction 저장
   */
  describe('saveMergeTransactions', () => {
    it('MergeTransaction이 정상적으로 저장된다', async () => {
      const mergeTransactions: MergeTransaction[] = [
        {
          transactionId: 'tx-1',
          storeId: 'store-1',
          date: '2021-01-01',
          amount: 1000,
          balance: 500,
          cancelYn: 'N',
          productId: 'product-1',
        },
      ];

      mockRepository.find.mockResolvedValue([]);
      mockRepository.save.mockResolvedValue(undefined);

      await service['saveMergeTransactions'](mergeTransactions);

      expect(mockRepository.save).toHaveBeenCalledWith(
        'merge_transactions',
        mergeTransactions,
      );
    });

    it('기존 데이터에 새 데이터가 추가된다', async () => {
      const existing: MergeTransaction[] = [
        {
          transactionId: 'tx-0',
          storeId: 'store-0',
          date: '2021-01-01',
          amount: 500,
          balance: 100,
          cancelYn: 'N',
          productId: 'product-0',
        },
      ];

      const newData: MergeTransaction[] = [
        {
          transactionId: 'tx-1',
          storeId: 'store-1',
          date: '2021-01-02',
          amount: 1000,
          balance: 200,
          cancelYn: 'N',
          productId: 'product-1',
        },
      ];

      mockRepository.find.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(undefined);

      await service['saveMergeTransactions'](newData);

      const savedData = mockRepository.save.mock.calls[0][1];
      expect(savedData).toHaveLength(2);
      expect(savedData).toEqual([...existing, ...newData]);
    });
  });

  /**
   * 테스트 3: Transaction ID 기록
   */
  describe('markTransactionsAsProcessed', () => {
    it('Transaction ID가 정상적으로 기록된다', async () => {
      const transactionIds = ['tx-1', 'tx-2'];

      mockRepository.find.mockResolvedValue([]);
      mockRepository.save.mockResolvedValue(undefined);

      await service['markTransactionsAsProcessed'](transactionIds);

      expect(mockRepository.save).toHaveBeenCalledWith(
        'processed_transaction_ids',
        transactionIds,
      );
    });

    it('중복된 ID는 제거되고 저장된다', async () => {
      const newIds = ['tx-1', 'tx-2', 'tx-1']; // tx-1 중복
      const existingIds = ['tx-0'];

      mockRepository.find.mockResolvedValue(existingIds);
      mockRepository.save.mockResolvedValue(undefined);

      await service['markTransactionsAsProcessed'](newIds);

      const savedIds = mockRepository.save.mock.calls[0][1];
      expect(savedIds).toContain('tx-0');
      expect(savedIds).toContain('tx-1');
      expect(savedIds).toContain('tx-2');
      expect(savedIds.length).toBe(3); // 중복 제거되어 3개
    });
  });

  /**
   * 테스트 4: 에러 핸들링
   */
  describe('에러 핸들링', () => {
    it('저장 실패 시 에러를 로깅한다', async () => {
      const mergeTransactions: MergeTransaction[] = [
        {
          transactionId: 'tx-1',
          storeId: 'store-1',
          date: '2021-01-01',
          amount: 1000,
          balance: 500,
          cancelYn: 'N',
          productId: 'product-1',
        },
      ];

      mockRepository.find.mockResolvedValue([]);
      mockRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(
        service['saveMergeTransactions'](mergeTransactions),
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
