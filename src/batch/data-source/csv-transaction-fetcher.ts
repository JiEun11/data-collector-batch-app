import { Transaction, TransactionFetcher } from '../type/transaction';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { BatchLogger } from '../../log/type/batch-logger';

export class CsvTransactionFetcher implements TransactionFetcher {
  constructor(private filePath: string, private logger: BatchLogger) { }

  async fetch(page: number): Promise<Transaction[]> {
    if (page > 1) {
      return [];
    }

    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const records = parse(raw, { columns: true, skip_empty_lines: true });
      return records as Transaction[];
    } catch (error) {
      this.logger.error('CsvTransactionFetcher.read error', error?.stack, {
        filePath: this.filePath,
        error: error?.message ?? error,
      });
      throw error;
    }
  }
}
