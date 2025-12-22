import { Test, TestingModule } from '@nestjs/testing';
import { BatchService } from './batch.service';
import { BatchLoggerService } from '../log/batch-logger.service';
import { TransactionCollectionService } from './services/transaction-collection.service';
import { MergeTransactionService } from './services/merge-transaction.service';
import { BatchRepositoryService } from './services/batch-repository.service';
import { TaskManagerService } from '../common/concurrency/task-manager.service';
import {
  TRANSACTION_FETCHERS,
  FetcherDefinition,
} from './data-source/fetcher.provider';
import { TransactionFetcher } from './type/transaction';

describe('BatchService 통합 테스트', () => {
  let service: BatchService;
  let mockLogger: jest.Mocked<BatchLoggerService>;
  let mockCollectionService: jest.Mocked<TransactionCollectionService>;
  let mockMergeService: jest.Mocked<MergeTransactionService>;
  let mockRepositoryService: jest.Mocked<BatchRepositoryService>;
  let mockTaskManager: jest.Mocked<TaskManagerService>;

  // Mock Fetcher 정의 (확장성 테스트용)
  const mockFetcherDefinitions: FetcherDefinition[] = [
    {
      name: 'Mock Source 1',
      fetcher: {
        fetch: jest.fn().mockResolvedValue([]),
      } as TransactionFetcher,
      enabled: true,
      priority: 1,
    },
    {
      name: 'Mock Source 2',
      fetcher: {
        fetch: jest.fn().mockResolvedValue([]),
      } as TransactionFetcher,
      enabled: true,
      priority: 2,
    },
  ];

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

    // TaskManager Mock
    mockTaskManager = {
      canExecute: jest.fn().mockReturnValue(true),
      startTask: jest.fn(),
      completeTask: jest.fn(),
      waitUntilCanExecute: jest.fn().mockResolvedValue(true),
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
        {
          provide: TaskManagerService,
          useValue: mockTaskManager,
        },
        // Mock Fetcher 정의 주입 (DI 기반 테스트)
        {
          provide: TRANSACTION_FETCHERS,
          useValue: mockFetcherDefinitions,
        },
      ],
    }).compile();

    service = module.get<BatchService>(BatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 테스트 1: DI 기반 Fetcher 주입 확인 (확장성 테스트)
   */
  describe('DI 기반 Fetcher 주입', () => {
    it('주입된 Fetcher 정의가 CollectionService에 전달된다', async () => {
      // Given
      mockCollectionService.fetchFromMultipleSources.mockResolvedValue([]);
      mockRepositoryService.getProcessedIds.mockResolvedValue([]);
      mockRepositoryService.filterDuplicates.mockReturnValue({
        new: [],
        duplicate: [],
      });

      // When
      await service.run();

      // Then: CollectionService가 Mock Fetcher들을 받았는지 확인
      expect(
        mockCollectionService.fetchFromMultipleSources,
      ).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Mock Source 1' }),
          expect.objectContaining({ name: 'Mock Source 2' }),
        ]),
      );
    });
  });

  /**
   * 테스트 2: 배치 작업 전체 흐름
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

  /**
   * 테스트 3: 다양한 Fetcher 구성 테스트 (확장성)
   */
  describe('다양한 Fetcher 구성', () => {
    it('빈 Fetcher 목록도 처리할 수 있다', async () => {
      // 빈 Fetcher로 새 모듈 생성
      const emptyModule = await Test.createTestingModule({
        providers: [
          BatchService,
          { provide: BatchLoggerService, useValue: mockLogger },
          {
            provide: TransactionCollectionService,
            useValue: mockCollectionService,
          },
          { provide: MergeTransactionService, useValue: mockMergeService },
          { provide: BatchRepositoryService, useValue: mockRepositoryService },
          { provide: TaskManagerService, useValue: mockTaskManager },
          { provide: TRANSACTION_FETCHERS, useValue: [] }, // 빈 배열
        ],
      }).compile();

      const emptyService = emptyModule.get<BatchService>(BatchService);

      mockCollectionService.fetchFromMultipleSources.mockResolvedValue([]);
      mockRepositoryService.getProcessedIds.mockResolvedValue([]);
      mockRepositoryService.filterDuplicates.mockReturnValue({
        new: [],
        duplicate: [],
      });

      // 에러 없이 실행되어야 함
      await expect(emptyService.run()).resolves.not.toThrow();
    });
  });
});
