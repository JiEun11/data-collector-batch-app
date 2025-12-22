export type LogLevel = 'ERROR' | 'LOG' | 'WARN' | 'DEBUG' | 'VERBOSE';

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  message: string;
  stack?: string;
  context?: any;
}
