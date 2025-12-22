import { Injectable, Inject } from '@nestjs/common';
import { Repository } from '../../database/repository';
import { JSON_REPOSITORY } from '../../database/repository.module';
import { MergeTransaction } from '../type/merge-transaction';

/**
 * @description 배치 데이터 저장/조회를 담당하는 서비스
 * - MergeTransaction 저장/조회
 * - 처리된 ID 관리
 * - 중복 체크
 */
@Injectable()
export class BatchRepositoryService {
  private readonly MERGE_TX_KEY = 'merge_transactions';
  private readonly PROCESSED_IDS_KEY = 'processed_transaction_ids';

  constructor(
    @Inject(JSON_REPOSITORY)
    private readonly repository: Repository<any>,
  ) { }

  /**
   * @description 처리된 Transaction ID 조회
   */
  async getProcessedIds(): Promise<string[]> {
    const ids = await this.repository.find(this.PROCESSED_IDS_KEY);
    return ids || [];
  }

  /**
   * @description Transaction ID 저장 (중복 제거)
   */
  async saveProcessedIds(newIds: string[]): Promise<void> {
    const existingIds = await this.getProcessedIds();
    const allIds = [...new Set([...existingIds, ...newIds])];

    await this.repository.save(this.PROCESSED_IDS_KEY, allIds);
  }

  /**
   * @description MergeTransaction 저장
   */
  async saveMergeTransactions(transactions: MergeTransaction[]): Promise<void> {
    const existing = await this.getAllMergeTransactions();
    const updated = [...existing, ...transactions];

    await this.repository.save(this.MERGE_TX_KEY, updated);
  }

  /**
   * @description 모든 MergeTransaction 조회
   */
  async getAllMergeTransactions(): Promise<MergeTransaction[]> {
    const data = await this.repository.find(this.MERGE_TX_KEY);
    return data || [];
  }

  /**
   * @description 중복 제거
   */
  filterDuplicates(
    transactions: any[],
    processedIds: string[],
  ): { new: any[]; duplicate: any[] } {
    const processedSet = new Set(processedIds);

    const newItems: any[] = [];
    const duplicates: any[] = [];

    for (const tx of transactions) {
      if (processedSet.has(tx.transactionId)) {
        duplicates.push(tx);
      } else {
        newItems.push(tx);
      }
    }

    return { new: newItems, duplicate: duplicates };
  }
}
