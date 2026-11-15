import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();
  logger.log('Background worker is running');
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('WorkerBootstrap');
  logger.error('Failed to start background worker', error);
  process.exitCode = 1;
});
