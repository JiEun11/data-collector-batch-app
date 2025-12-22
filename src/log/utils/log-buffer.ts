import { LogRecord } from '../type/log-record';
import { Repository } from '../../database/repository';

/**
 * @description 로그 버퍼 관리 클래스
 * - 메모리에 로그 임시 저장
 * - 일정 크기 도달 시 자동 flush
 * - DB에 로그 저장
 *
 * 동작 방식:
 * 1. addLog(): 버퍼에 로그 추가
 * 2. 버퍼 크기가 50 이상이면 자동 flush
 * 3. flush(): 버퍼의 로그를 DB에 저장
 */
export class LogBuffer {
  private buffer: LogRecord[] = [];
  private isFlushing = false;
  private readonly BUFFER_SIZE_LIMIT = 50;

  constructor(
    private readonly repository: Repository<LogRecord[]>,
    private readonly storageKey: string,
  ) { }

  /**
   * @description 로그를 버퍼에 추가
   */
  add(record: LogRecord): void {
    this.buffer.push(record);

    // 버퍼가 꽉 차면 자동 flush
    if (this.buffer.length >= this.BUFFER_SIZE_LIMIT && !this.isFlushing) {
      this.flush();
    }

    // 비동기로 flush
    setImmediate(() => this.flush());
  }

  /**
   * @description 버퍼의 로그를 DB에 저장
   */
  async flush(): Promise<void> {
    // 이미 flush 중이거나 버퍼가 비어있으면 스킵
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      // 버퍼 복사 후 초기화
      const logsToSave = [...this.buffer];
      this.buffer = [];

      // DB에서 기존 로그 조회
      const existingLogs = (await this.repository.find(this.storageKey)) || [];

      // 기존 로그 + 새 로그 합치기
      const updatedLogs = [...existingLogs, ...logsToSave];

      // DB에 저장
      await this.repository.save(this.storageKey, updatedLogs);
    } catch (error) {
      console.error('[LogBuffer] Failed to flush logs:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * @description 남은 로그 모두 저장 (애플리케이션 종료 시)
   */
  async flushAll(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.flush();
    }
  }

  /**
   * @description 현재 버퍼 크기 반환 (디버깅용)
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}
