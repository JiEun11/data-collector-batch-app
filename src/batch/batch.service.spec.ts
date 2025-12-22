import { Test, TestingModule } from '@nestjs/testing';
import { BatchService } from './batch.service';
import { BatchLoggerService } from '../log/batch-logger.service';
import { TransactionCollectionService } from './services/transaction-collection.service';
import { MergeTransactionService } from './services/merge-transaction.service';
import { BatchRepositoryService } from './services/batch-repository.service';

describe('BatchService 통합 테스트', () => {
  let service: BatchService;
  let mockLogger: jest.Mocked<BatchLoggerService>;
  let mockCollectionService: jest.Mocked<TransactionCollectionService>;
  let mockMergeService: jest.Mocked<MergeTransactionService>;
  let mockRepositoryService: jest.Mocked<BatchRepositoryService>;

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

    // CollectionService Mock
    mockCollectionService = {
      fetchFromMultipleSources: jest.fn(),
      fetchAllFromSource: jest.fn(),
    } as any;

    // MergeService Mock
    mockMergeService = {
      createMergeTransactions: jest.fn(),
    } as any;

    // RepositoryService Mock
    mockRepositoryService = {
      getProcessedIds: jest.fn(),
      saveProcessedIds: jest.fn(),
      saveMergeTransactions: jest.fn(),
      getAllMergeTransactions: jest.fn(),
      filterDuplicates: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchService,
        {
          provide: BatchLoggerService,
          useValue: mockLogger,
        },
        {
          provide: TransactionCollectionService,
          useValue: mockCollectionService,
        },
        {
          provide: MergeTransactionService,
          useValue: mockMergeService,
        },
        {
          provide: BatchRepositoryService,
          useValue: mockRepositoryService,
        },
      ],
    }).compile();

    service = module.get<BatchService>(BatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 테스트 1: 배치 작업 전체 흐름
   */
  describe('run', () => {
    it('새로운 데이터가 없으면 조기 종료한다', async () => {
      // Given: 모든 데이터가 중복
      mockCollectionService.fetchFromMultipleSources.mockResolvedValue([
        {
          transactionId: 'tx-1',
          storeId: 'store-1',
          date: '2021-01-01',
          amount: 1000,
          balance: 500,
          cancelYn: 'N' as const,
        },
      ]);

      mockRepositoryService.getProcessedIds.mockResolvedValue(['tx-1']);
      mockRepositoryService.filterDuplicates.mockReturnValue({
        new: [],
        duplicate: [
          {
            transactionId: 'tx-1',
            storeId: 'store-1',
            date: '2021-01-01',
            amount: 1000,
            balance: 500,
            cancelYn: 'N' as const,
          },
        ],
      });

      // When
      await service.run();

      // Then: MergeTransaction 생성이 호출되지 않음
      expect(mockMergeService.createMergeTransactions).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        '처리할 새로운 데이터가 없습니다.',
      );
    });

    it('정상적인 배치 작업이 완료된다', async () => {
      // Given
      const transactions = [
        {
          transactionId: 'tx-1',
          storeId: 'store-1',
          date: '2021-01-01',
          amount: 1000,
          balance: 500,
          cancelYn: 'N' as const,
        },
      ];

      const mergeTransactions = [
        {
          ...transactions[0],
          productId: 'product-1',
        },
      ];

      mockCollectionService.fetchFromMultipleSources.mockResolvedValue(
        transactions,
      );
      mockRepositoryService.getProcessedIds.mockResolvedValue([]);
      mockRepositoryService.filterDuplicates.mockReturnValue({
        new: transactions,
        duplicate: [],
      });
      mockMergeService.createMergeTransactions.mockResolvedValue({
        successful: mergeTransactions,
        failed: [],
      });

      // When
      await service.run();

      // Then
      expect(mockRepositoryService.saveMergeTransactions).toHaveBeenCalledWith(
        mergeTransactions,
      );
      expect(mockRepositoryService.saveProcessedIds).toHaveBeenCalledWith([
        'tx-1',
      ]);
      expect(mockLogger.logSuccess).toHaveBeenCalled();
    });

    it('에러 발생 시 로깅하고 재throw 한다', async () => {
      // Given
      const error = new Error('Test error');
      mockCollectionService.fetchFromMultipleSources.mockRejectedValue(error);

      // When & Then
      await expect(service.run()).rejects.toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
