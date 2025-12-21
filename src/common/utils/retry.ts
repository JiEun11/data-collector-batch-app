export type RetryableFn<T> = () => Promise<T>;

export function createRetryPolicy(
  maxRetries: number,
  delayMs = 300,
): (fn: RetryableFn<any>) => Promise<any> {
  return async function <T>(fn: RetryableFn<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error: any) {
        const status = error?.response?.status ?? error?.status;
        const is502 = status === 502;
        attempt++;
        if (!is502 || attempt > maxRetries) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  };
}
