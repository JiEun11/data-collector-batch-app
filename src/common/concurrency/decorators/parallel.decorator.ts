import { TaskType, ResourceGroup } from '../types/task.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * @description Parallel Task Decorator
 *
 * 사용법:
 * @Parallel(ResourceGroup.DATA_COLLECTION)
 * async myMethod() { ... }
 *
 * @param resourceGroup 리소스 그룹
 * @param options 추가 옵션
 */
export function Parallel(
  resourceGroup: ResourceGroup,
  options: {
    maxWaitTime?: number;
    taskName?: string;
  } = {},
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const taskManager = (this as any).taskManager;

      if (!taskManager) {
        console.error(
          '[Parallel] TaskManager를 찾을 수 없습니다. 클래스에 TaskManagerService를 주입해주세요.',
        );
        throw new Error('TaskManager is required for @Parallel decorator');
      }

      const taskId = uuidv4();
      const taskName =
        options.taskName || `${target.constructor.name}.${propertyKey}`;
      const maxWaitTime = options.maxWaitTime || 300000;

      const startTime = Date.now();

      try {
        const canRun = await taskManager.waitUntilCanExecute(
          taskId,
          TaskType.PARALLEL,
          resourceGroup,
          taskName,
          maxWaitTime,
        );

        if (!canRun) {
          throw new Error(`작업 대기 시간이 초과되었습니다: ${taskName}`);
        }

        const waitTime = Date.now() - startTime;

        taskManager.startTask(
          taskId,
          TaskType.PARALLEL,
          resourceGroup,
          taskName,
        );

        const executionStartTime = Date.now();
        const result = await originalMethod.apply(this, args);
        const executionTime = Date.now() - executionStartTime;

        taskManager.completeTask(taskId);

        if (waitTime > 0 || executionTime > 1000) {
          console.log(
            `[Parallel] 작업이 완료되었습니다: ${taskName} (대기 시간: ${waitTime}ms, 실행 시간: ${executionTime}ms)`,
          );
        }

        return result;
      } catch (error) {
        taskManager.completeTask(taskId, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}
