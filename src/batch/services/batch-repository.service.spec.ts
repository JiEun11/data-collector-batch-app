import { Test, TestingModule } from '@nestjs/testing';
import { BatchRepositoryService } from './batch-repository.service';
import { JSON_REPOSITORY } from '../../database/repository.module';
import { Transaction } from '../type/transaction';
import { MergeTransaction } from '../type/merge-transaction';

describe('BatchRepositoryService 단위 테스트', () => {
  let service: BatchRepositoryService;
  let mockRepository: any;

  beforeEach(async () => {
    // Repository Mock
    mockRepository = {
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchRepositoryService,
        {
          provide: JSON_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BatchRepositoryService>(BatchRepositoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 테스트 1: 중복 제거
   */
  describe('filterDuplicates', () => {
    it('이미 처리된 Transaction은 필터링되어야 한다', () => {
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

      const processedIds = ['tx-1'];

      const result = service.filterDuplicates(transactions, processedIds);

      expect(result.new).toHaveLength(1);
      expect(result.new[0].transactionId).toBe('tx-2');
      expect(result.duplicate).toHaveLength(1);
      expect(result.duplicate[0].transactionId).toBe('tx-1');
    });

    it('모든 Transaction이 새로운 경우 전체 반환', () => {
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

      const processedIds: string[] = [];

      const result = service.filterDuplicates(transactions, processedIds);

      expect(result.new).toHaveLength(1);
      expect(result.duplicate).toHaveLength(0);
    });

    it('모든 Transaction이 중복인 경우 빈 배열 반환', () => {
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

      const processedIds = ['tx-1'];

      const result = service.filterDuplicates(transactions, processedIds);

      expect(result.new).toHaveLength(0);
      expect(result.duplicate).toHaveLength(1);
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

      await service.saveMergeTransactions(mergeTransactions);

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

      await service.saveMergeTransactions(newData);

      const savedData = mockRepository.save.mock.calls[0][1];
      expect(savedData).toHaveLength(2);
      expect(savedData).toEqual([...existing, ...newData]);
    });
  });

  /**
   * 테스트 3: Transaction ID 저장
   */
  describe('saveProcessedIds', () => {
    it('Transaction ID가 정상적으로 기록된다', async () => {
      const transactionIds = ['tx-1', 'tx-2'];

      mockRepository.find.mockResolvedValue([]);
      mockRepository.save.mockResolvedValue(undefined);

      await service.saveProcessedIds(transactionIds);

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

      await service.saveProcessedIds(newIds);

      const savedIds = mockRepository.save.mock.calls[0][1];
      expect(savedIds).toContain('tx-0');
      expect(savedIds).toContain('tx-1');
      expect(savedIds).toContain('tx-2');
      expect(savedIds.length).toBe(3); // 중복 제거되어 3개
    });
  });

  /**
   * 테스트 4: 조회
   */
  describe('getProcessedIds', () => {
    it('저장된 ID 목록을 조회한다', async () => {
      const ids = ['tx-1', 'tx-2'];
      mockRepository.find.mockResolvedValue(ids);

      const result = await service.getProcessedIds();

      expect(result).toEqual(ids);
      expect(mockRepository.find).toHaveBeenCalledWith(
        'processed_transaction_ids',
      );
    });

    it('저장된 ID가 없으면 빈 배열을 반환한다', async () => {
      mockRepository.find.mockResolvedValue(null);

      const result = await service.getProcessedIds();

      expect(result).toEqual([]);
    });
  });

  describe('getAllMergeTransactions', () => {
    it('저장된 MergeTransaction 목록을 조회한다', async () => {
      const transactions: MergeTransaction[] = [
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

      mockRepository.find.mockResolvedValue(transactions);

      const result = await service.getAllMergeTransactions();

      expect(result).toEqual(transactions);
      expect(mockRepository.find).toHaveBeenCalledWith('merge_transactions');
    });

    it('저장된 데이터가 없으면 빈 배열을 반환한다', async () => {
      mockRepository.find.mockResolvedValue(null);

      const result = await service.getAllMergeTransactions();

      expect(result).toEqual([]);
    });
  });
});
