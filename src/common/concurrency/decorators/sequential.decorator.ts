import { TaskType, ResourceGroup } from '../types/task.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * @description Sequential Task Decorator
 *
 * 사용법:
 * @Sequential(ResourceGroup.BATCH_JOB)
 * async myMethod() { ... }
 *
 * @param resourceGroup 리소스 그룹 (동일한 리소스에 접근하는 작업들을 그룹화)
 * @param options 추가 옵션
 */
export function Sequential(
  resourceGroup: ResourceGroup,
  options: {
    maxWaitTime?: number; // 최대 대기 시간 (ms)
    taskName?: string; // Task 이름 (자동 생성 가능)
  } = {},
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // TaskManager 인스턴스 가져오기
      const taskManager = (this as any).taskManager;

      if (!taskManager) {
        console.error(
          '[Sequential] TaskManager를 찾을 수 없습니다. 클래스에 TaskManagerService를 주입해주세요.',
        );
        throw new Error('TaskManager is required for @Sequential decorator');
      }

      // Task ID 생성
      const taskId = uuidv4();
      const taskName =
        options.taskName || `${target.constructor.name}.${propertyKey}`;
      const maxWaitTime = options.maxWaitTime || 300000; // 기본 5분

      const startTime = Date.now();

      try {
        // 1. 실행 가능 여부 확인 및 대기
        const canRun = await taskManager.waitUntilCanExecute(
          taskId,
          TaskType.SEQUENTIAL,
          resourceGroup,
          taskName,
          maxWaitTime,
        );

        if (!canRun) {
          throw new Error(`작업 대기 시간이 초과되었습니다: ${taskName}`);
        }

        const waitTime = Date.now() - startTime;

        // 2. Task 시작 등록
        taskManager.startTask(
          taskId,
          TaskType.SEQUENTIAL,
          resourceGroup,
          taskName,
        );

        const executionStartTime = Date.now();

        // 3. 원래 메서드 실행
        const result = await originalMethod.apply(this, args);

        const executionTime = Date.now() - executionStartTime;

        // 4. Task 완료 등록
        taskManager.completeTask(taskId);

        if (waitTime > 0 || executionTime > 1000) {
          console.log(
            `[Sequential] 작업이 완료되었습니다: ${taskName} (대기 시간: ${waitTime}ms, 실행 시간: ${executionTime}ms)`,
          );
        }

        return result;
      } catch (error) {
        // 에러 발생 시에도 Task 완료 처리
        taskManager.completeTask(taskId, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}
