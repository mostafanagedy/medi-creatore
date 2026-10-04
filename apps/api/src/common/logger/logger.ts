import { Logger } from '@nestjs/common';

export function createLogger(context: string): Logger {
  return new Logger(context);
}

export class AppLogger extends Logger {
  log(message: string, context?: string): void {
    super.log(message, context ?? this.context ?? '');
  }

  error(message: string, trace?: string, context?: string): void {
    super.error(message, trace, context ?? this.context ?? '');
  }

  warn(message: string, context?: string): void {
    super.warn(message, context ?? this.context ?? '');
  }
}
