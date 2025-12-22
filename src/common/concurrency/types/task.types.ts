/**
 * @description Task 실행 타입
 * - Sequential: 순차 처리 (다른 모든 작업 대기)
 * - Parallel: 병렬 처리 (다른 Parallel 작업과 동시 실행 가능)
 */
export enum TaskType {
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
}

/**
 * @description Task 상태
 */
export enum TaskStatus {
  PENDING = 'PENDING', // 대기 중
  RUNNING = 'RUNNING', // 실행 중
  COMPLETED = 'COMPLETED', // 완료
  FAILED = 'FAILED', // 실패
}

/**
 * @description 리소스 그룹 (Vendor)
 * - 동일한 리소스에 접근하는 작업들을 그룹화
 * - 예: BATCH_JOB, DATA_COLLECTION, FILE_WRITE 등
 */
export enum ResourceGroup {
  BATCH_JOB = 'BATCH_JOB', // 배치 작업 전체
  DATA_COLLECTION = 'DATA_COLLECTION', // 데이터 수집
  DATA_MERGE = 'DATA_MERGE', // 데이터 병합
  FILE_WRITE = 'FILE_WRITE', // 파일 쓰기
  API_PORT_4001 = 'API_PORT_4001', // 4001 포트 API
  API_PORT_4002 = 'API_PORT_4002', // 4002 포트 API
  API_PORT_4003 = 'API_PORT_4003', // 4003 포트 API
  CSV_READ = 'CSV_READ', // CSV 파일 읽기
}

/**
 * @description Task 정보
 */
export interface Task {
  id: string; // Task 고유 ID
  type: TaskType; // Task 타입
  resourceGroup: ResourceGroup; // 리소스 그룹
  status: TaskStatus; // Task 상태
  name: string; // Task 이름
  startedAt?: number; // 시작 시간 (timestamp)
  completedAt?: number; // 완료 시간 (timestamp)
  error?: string; // 에러 메시지
}

/**
 * @description Task 실행 결과
 */
export interface TaskExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  waitTime?: number; // 대기 시간 (ms)
  executionTime?: number; // 실행 시간 (ms)
}
