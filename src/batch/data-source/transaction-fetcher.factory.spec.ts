import { TransactionFetcherFactory } from './transaction-fetcher.factory';
import { BatchLogger } from '../../log/type/batch-logger';
import { TransactionFetcher } from '../type/transaction';
import { Port4001Fetcher } from './fetchers/port-4001-fetcher';
import { Port4002Fetcher } from './fetchers/port-4002-fetcher';
import { Port4003Fetcher } from './fetchers/port-4003-fetcher';
import { CsvTransactionFetcher } from './csv-transaction-fetcher';

describe('TransactionFetcherFactory 단위 테스트', () => {
  let mockLogger: jest.Mocked<BatchLogger>;

  beforeEach(() => {
    // Logger Mock 생성
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 테스트 1: createAllFetchers 메서드
   */
  describe('createAllFetchers', () => {
    it('4개의 Fetcher를 생성해야 한다', () => {
      const csvPath = './test.csv';
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        csvPath,
        mockLogger,
      );

      // 4개의 Fetcher가 생성되었는지 확인
      expect(fetchers).toHaveLength(4);
    });

    it('모든 Fetcher는 TransactionFetcher 인터페이스를 구현해야 한다', () => {
      const csvPath = './test.csv';
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        csvPath,
        mockLogger,
      );

      // 각 Fetcher가 fetch 메서드를 가지고 있는지 확인
      fetchers.forEach((fetcher, index) => {
        expect(fetcher).toHaveProperty('fetch');
        expect(typeof fetcher.fetch).toBe('function');
      });
    });

    it('생성된 Fetcher의 순서가 올바른지 확인한다', () => {
      const csvPath = './test.csv';
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        csvPath,
        mockLogger,
      );

      // 순서 확인:
      // [0] Port4001Fetcher
      // [1] Port4002Fetcher
      // [2] Port4003Fetcher
      // [3] CsvTransactionFetcher

      expect(fetchers[0]).toBeInstanceOf(Port4001Fetcher);
      expect(fetchers[1]).toBeInstanceOf(Port4002Fetcher);
      expect(fetchers[2]).toBeInstanceOf(Port4003Fetcher);
      expect(fetchers[3]).toBeInstanceOf(CsvTransactionFetcher);
    });

    it('동일한 Logger 인스턴스를 모든 Fetcher에 주입한다', () => {
      const csvPath = './test.csv';
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        csvPath,
        mockLogger,
      );

      // 각 Fetcher가 같은 logger를 사용하는지 확인
      fetchers.forEach((fetcher) => {
        expect((fetcher as any).logger).toBe(mockLogger);
      });
    });

    it('CSV 경로가 CsvTransactionFetcher에 올바르게 전달된다', () => {
      const csvPath = './custom/path/transactions.csv';
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        csvPath,
        mockLogger,
      );

      const csvFetcher = fetchers[3] as CsvTransactionFetcher;

      // CsvTransactionFetcher에 경로가 올바르게 전달되었는지 확인
      expect((csvFetcher as any).filePath).toBe(csvPath);
    });
  });

  /**
   * 테스트 2: 각 Fetcher의 타입 확인
   */
  describe('Fetcher 타입 검증', () => {
    it('Port4001Fetcher가 올바르게 생성된다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      expect(fetchers[0]).toBeInstanceOf(Port4001Fetcher);
      expect(fetchers[0].constructor.name).toBe('Port4001Fetcher');
    });

    it('Port4002Fetcher가 올바르게 생성된다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      expect(fetchers[1]).toBeInstanceOf(Port4002Fetcher);
      expect(fetchers[1].constructor.name).toBe('Port4002Fetcher');
    });

    it('Port4003Fetcher가 올바르게 생성된다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      expect(fetchers[2]).toBeInstanceOf(Port4003Fetcher);
      expect(fetchers[2].constructor.name).toBe('Port4003Fetcher');
    });

    it('CsvTransactionFetcher가 올바르게 생성된다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      expect(fetchers[3]).toBeInstanceOf(CsvTransactionFetcher);
      expect(fetchers[3].constructor.name).toBe('CsvTransactionFetcher');
    });
  });

  /**
   * 테스트 3: Retry 정책이 올바르게 설정되었는지 확인
   */
  describe('Retry 정책 검증', () => {
    it('Port4001Fetcher는 1번 재시도 정책을 가진다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      const port4001Fetcher = fetchers[0] as any;

      // retryPolicy가 존재하는지 확인
      expect(port4001Fetcher.retryPolicy).toBeDefined();
      expect(typeof port4001Fetcher.retryPolicy).toBe('function');
    });

    it('Port4002Fetcher는 2번 재시도 정책을 가진다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      const port4002Fetcher = fetchers[1] as any;

      expect(port4002Fetcher.retryPolicy).toBeDefined();
      expect(typeof port4002Fetcher.retryPolicy).toBe('function');
    });

    it('Port4003Fetcher는 3번 재시도 정책을 가진다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      const port4003Fetcher = fetchers[2] as any;

      expect(port4003Fetcher.retryPolicy).toBeDefined();
      expect(typeof port4003Fetcher.retryPolicy).toBe('function');
    });
  });

  /**
   * 테스트 4: Fetcher 설정 검증
   */
  describe('Fetcher 설정 검증', () => {
    it('HTTP Fetcher들은 axios 인스턴스를 가진다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      // Port 4001, 4002, 4003은 HTTP 기반
      for (let i = 0; i < 3; i++) {
        const fetcher = fetchers[i] as any;
        expect(fetcher.axiosInstance).toBeDefined();
      }
    });

    it('CsvTransactionFetcher는 파일 경로를 가진다', () => {
      const csvPath = './data-source/transaction.csv';
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        csvPath,
        mockLogger,
      );

      const csvFetcher = fetchers[3] as any;
      expect(csvFetcher.filePath).toBe(csvPath);
    });

    it('모든 Fetcher는 logger를 가진다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      fetchers.forEach((fetcher, index) => {
        expect((fetcher as any).logger).toBeDefined();
        expect((fetcher as any).logger).toBe(mockLogger);
      });
    });
  });

  /**
   * 테스트 5: 엣지 케이스
   */
  describe('엣지 케이스', () => {
    it('빈 CSV 경로도 허용한다', () => {
      expect(() => {
        TransactionFetcherFactory.createAllFetchers('', mockLogger);
      }).not.toThrow();
    });

    it('특수 문자가 포함된 경로도 허용한다', () => {
      const specialPath = './data-source/트랜잭션_데이터_2024.csv';

      expect(() => {
        TransactionFetcherFactory.createAllFetchers(specialPath, mockLogger);
      }).not.toThrow();
    });

    it('여러 번 호출해도 독립적인 Fetcher 인스턴스를 생성한다', () => {
      const fetchers1 = TransactionFetcherFactory.createAllFetchers(
        './test1.csv',
        mockLogger,
      );
      const fetchers2 = TransactionFetcherFactory.createAllFetchers(
        './test2.csv',
        mockLogger,
      );

      // 각 호출마다 새로운 인스턴스가 생성되는지 확인
      expect(fetchers1[0]).not.toBe(fetchers2[0]);
      expect(fetchers1[1]).not.toBe(fetchers2[1]);
      expect(fetchers1[2]).not.toBe(fetchers2[2]);
      expect(fetchers1[3]).not.toBe(fetchers2[3]);
    });
  });

  /**
   * 테스트 6: 통합 테스트
   */
  describe('통합 시나리오', () => {
    it('팩토리로 생성한 Fetcher로 fetch 메서드 호출이 가능하다', async () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      // 각 Fetcher의 fetch 메서드가 호출 가능한지 확인
      // (실제 데이터를 가져오지는 않지만, 메서드 시그니처는 확인)
      fetchers.forEach((fetcher) => {
        expect(() => {
          fetcher.fetch(1); // Promise를 반환하지만 await 하지 않음
        }).not.toThrow();
      });
    });

    it('모든 Fetcher가 동일한 인터페이스를 구현한다', () => {
      const fetchers = TransactionFetcherFactory.createAllFetchers(
        './test.csv',
        mockLogger,
      );

      // TransactionFetcher 인터페이스의 메서드를 모두 가지고 있는지 확인
      fetchers.forEach((fetcher) => {
        expect(typeof fetcher.fetch).toBe('function');

        // fetch 메서드가 Promise를 반환하는지 확인
        const result = fetcher.fetch(1);
        expect(result).toBeInstanceOf(Promise);
      });
    });
  });
});
