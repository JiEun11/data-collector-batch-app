import { Injectable } from '@nestjs/common';
import { TransactionFetcher, Transaction } from '../type/transaction';
import { BatchLoggerService } from '../../log/batch-logger.service';

/**
 * @description Transaction 수집을 담당하는 서비스
 * - 여러 data-source에서 Transaction 수집
 * - 페이징 처리
 * - 에러 핸들링
 */
@Injectable()
export class TransactionCollectionService {
  constructor(private readonly logger: BatchLoggerService) { }

  /**
   * @description 단일 소스에서 모든 페이지 데이터 수집
   */
  async fetchAllFromSource(
    fetcher: TransactionFetcher,
    sourceName: string,
  ): Promise<Transaction[]> {
    const allData: Transaction[] = [];
    let page = 1;
    const maxPages = 100; // 무한 루프 방지

    this.logger.log(`[${sourceName}] 데이터 수집 시작`);

    while (page <= maxPages) {
      try {
        const pageData = await fetcher.fetch(page);

        // 빈 페이지면 종료
        if (pageData.length === 0) {
          break;
        }

        allData.push(...pageData);
        this.logger.log(
          `[${sourceName}] Page ${page}: ${pageData.length}개 수집`,
        );

        page++;
      } catch (error) {
        // 404 에러는 정상 종료
        if (this.isEndOfData(error)) {
          break;
        }

        console.error(`[${sourceName}] Page ${page} 수집 실패`);
        console.error(`[${sourceName}] 에러 메시지: ${error.message}`);
        console.error(`[${sourceName}] 에러 스택:`, error.stack);

        // 다른 에러는 로깅 후 중단
        this.logger.error(
          `[${sourceName}] Page ${page} 수집 실패`,
          error.stack,
          { page, error: error.message },
        );
        break;
      }
    }

    this.logger.log(`[${sourceName}] 수집 완료: 총 ${allData.length}개`);
    return allData;
  }

  /**
   * @description 여러 소스에서 동시에 데이터 수집
   */
  async fetchFromMultipleSources(
    sources: Array<{ fetcher: TransactionFetcher; name: string }>,
  ): Promise<Transaction[]> {
    const results: Transaction[] = [];

    // 순차 처리
    for (const source of sources) {
      try {
        const data = await this.fetchAllFromSource(source.fetcher, source.name);
        results.push(...data);
      } catch (error) {
        // 하나의 소스 실패해도 계속 진행, 상세 로깅
        console.error(`[${source.name}] 수집 실패, 계속 진행`);
        console.error(`[${source.name}] 에러: ${error.message}`);
        this.logger.warn(`[${source.name}] 수집 실패, 계속 진행`);
      }
    }

    return results;
  }

  /**
   * @description 데이터 끝인지 판단
   */
  private isEndOfData(error: any): boolean {
    const status = error?.response?.status;
    return status === 404 || status === 400;
  }
}
