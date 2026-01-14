import { Injectable } from '@nestjs/common';
import { Task, TaskType, TaskStatus, ResourceGroup } from './types/task.types';

/**
 * @description 인메모리 기반 Task 관리 서비스
 *
 * 동시성 제어 규칙:
 * 1. Sequential 작업 실행 중 -> 같은 리소스 그룹의 모든 작업 대기
 * 2. Parallel 작업 실행 중 -> 같은 리소스 그룹의 새로운 Parallel 작업은 병렬 실행, Sequential은 대기
 * 3. 아무 작업 없음 -> 즉시 실행
 */
@Injectable()
export class TaskManagerService {
  /**
   * @description 현재 실행 중인 Task들을 메모리에 저장
   * Key: Task ID
   * Value: Task 정보
   */
  private runningTasks: Map<string, Task> = new Map();

  // 대기 중인 Task Queue
  private pendingTasks: Map<string, Task> = new Map();

  /**
   * @description Task를 등록하고 실행 가능 여부 확인
   * @param taskId Task 고유 ID
   * @param taskType Task 타입
   * @param resourceGroup 리소스 그룹
   * @param taskName Task 이름
   * @returns 즉시 실행 가능 여부
   */
  canExecute(
    taskId: string,
    taskType: TaskType,
    resourceGroup: ResourceGroup,
    taskName: string,
  ): boolean {
    const task: Task = {
      id: taskId,
      type: taskType,
      resourceGroup,
      status: TaskStatus.PENDING,
      name: taskName,
    };

    // 같은 리소스 그룹에서 Sequential 작업이 실행 중이면 대기
    const hasSequentialRunning = this.hasRunningTaskOfTypeInGroup(
      TaskType.SEQUENTIAL,
      resourceGroup,
    );
    if (hasSequentialRunning) {
      this.pendingTasks.set(taskId, task);
      console.log(
        `[TaskManager] ${resourceGroup} Sequential 작업이 실행 중이므로 작업을 대기 상태로 전환합니다: ${taskName}`,
      );
      return false;
    }

    // Sequential 작업을 시작하려는데 같은 리소스 그룹에 다른 작업이 실행 중이면 대기
    if (taskType === TaskType.SEQUENTIAL) {
      const hasAnyRunningInGroup = this.hasRunningTaskInGroup(resourceGroup);
      if (hasAnyRunningInGroup) {
        this.pendingTasks.set(taskId, task);
        console.log(
          `[TaskManager] ${resourceGroup} 다른 작업이 실행 중이므로 Sequential 작업을 대기 상태로 전환합니다: ${taskName}`,
        );
        return false;
      }
    }

    // Parallel 작업은 같은 리소스 그룹의 다른 Parallel 작업과 동시 실행 가능
    return true;
  }

  /**
   * @description Task 시작 등록
   */
  startTask(
    taskId: string,
    taskType: TaskType,
    resourceGroup: ResourceGroup,
    taskName: string,
  ): void {
    const task: Task = {
      id: taskId,
      type: taskType,
      resourceGroup,
      status: TaskStatus.RUNNING,
      name: taskName,
      startedAt: Date.now(),
    };

    this.runningTasks.set(taskId, task);
    this.pendingTasks.delete(taskId);

    console.log(
      `[TaskManager] 작업을 시작합니다: ${taskName} (타입: ${taskType}), 리소스 그룹: ${resourceGroup}`,
    );
    this.printStatus();
  }

  /**
   * @description Task 완료 등록
   */
  completeTask(taskId: string, error?: Error): void {
    const task = this.runningTasks.get(taskId);
    if (!task) {
      console.warn(`[TaskManager] 작업을 찾을 수 없습니다: ${taskId}`);
      return;
    }

    task.status = error ? TaskStatus.FAILED : TaskStatus.COMPLETED;
    task.completedAt = Date.now();
    if (error) {
      task.error = error.message;
    }

    this.runningTasks.delete(taskId);

    const duration = task.completedAt - (task.startedAt || task.completedAt);
    console.log(
      `[TaskManager] 작업이 완료되었습니다: ${task.name} (타입: ${task.type
      }), 리소스 그룹: ${task.resourceGroup}  (소요 시간: ${duration}ms)${error ? ' - 실패' : ''
      }`,
    );

    this.printStatus();

    // 대기 중인 Task가 있으면 처리 가능 여부 재확인
    this.checkPendingTasks();
  }

  /**
   * @description 특정 리소스 그룹에서 특정 타입의 실행 중인 Task가 있는지 확인
   */
  private hasRunningTaskOfTypeInGroup(
    type: TaskType,
    resourceGroup: ResourceGroup,
  ): boolean {
    return Array.from(this.runningTasks.values()).some(
      (task) => task.type === type && task.resourceGroup === resourceGroup,
    );
  }

  /**
   * @description 특정 리소스 그룹에 실행 중인 Task가 있는지 확인
   */
  private hasRunningTaskInGroup(resourceGroup: ResourceGroup): boolean {
    return Array.from(this.runningTasks.values()).some(
      (task) => task.resourceGroup === resourceGroup,
    );
  }

  /**
   * @description 대기 중인 Task들 중 실행 가능한 것 확인
   */
  private checkPendingTasks(): void {
    if (this.pendingTasks.size === 0) {
      return;
    }

    console.log(
      `[TaskManager] 대기 중인 작업을 확인합니다 (총 ${this.pendingTasks.size}개)`,
    );

    // 현재는 자동 실행하지 않고, 다음 실행 시 canExecute에서 판단
    // 필요 시 여기에서 대기 작업을 자동 실행하는 로직을 추가할 수 있습니다.
  }

  /**
   * @description 현재 상태 출력 (디버깅용)
   */
  private printStatus(): void {
    const runningByGroup = this.groupTasksByResource(
      Array.from(this.runningTasks.values()),
    );
    const pendingByGroup = this.groupTasksByResource(
      Array.from(this.pendingTasks.values()),
    );

    console.log(
      `[TaskManager] 실행 중: ${this.runningTasks.size}개`,
      runningByGroup,
    );
    console.log(
      `[TaskManager] 대기 중: ${this.pendingTasks.size}개`,
      pendingByGroup,
    );
  }

  /**
   * @description Task들을 리소스 그룹별로 그룹화
   */
  private groupTasksByResource(tasks: Task[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    for (const task of tasks) {
      grouped[task.resourceGroup] = (grouped[task.resourceGroup] || 0) + 1;
    }

    return grouped;
  }

  /**
   * @description 모든 Task 상태 조회 (모니터링용)
   */
  getStatus() {
    return {
      running: Array.from(this.runningTasks.values()),
      pending: Array.from(this.pendingTasks.values()),
    };
  }

  /**
   * @description 특정 Task 대기 (Polling 방식)
   * @param taskId Task ID
   * @param taskType Task 타입
   * @param maxWaitTime 최대 대기 시간 (ms)
   * @param pollInterval 확인 주기 (ms)
   */
  async waitUntilCanExecute(
    taskId: string,
    taskType: TaskType,
    resourceGroup: ResourceGroup,
    taskName: string,
    maxWaitTime = 300000, // 5분
    pollInterval = 1000, // 1초
  ): Promise<boolean> {
    const startTime = Date.now();
    // FIXME: Polling 방식 외에 Event Driven 방식으로 수정 필요 (event emitter 등)
    while (Date.now() - startTime < maxWaitTime) {
      if (this.canExecute(taskId, taskType, resourceGroup, taskName)) {
        const waitTime = Date.now() - startTime;
        console.log(
          `[TaskManager] 작업 대기가 완료되었습니다: ${taskName} (대기 시간: ${waitTime}ms)`,
        );
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    console.error(`[TaskManager] 작업 대기 시간이 초과되었습니다: ${taskName}`);
    return false;
  }

  /**
   * @description 모든 Task 초기화 (테스트용)
   */
  reset(): void {
    this.runningTasks.clear();
    this.pendingTasks.clear();
    console.log('[TaskManager] 모든 작업 상태를 초기화했습니다');
  }
}
