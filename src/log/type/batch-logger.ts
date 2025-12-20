export interface BatchLogger {
  error(message: string, stack?: string, context?: any): void;
  log(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  verbose(message: string, context?: any): void;
}
