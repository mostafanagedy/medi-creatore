import { Logger } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import { UnrecoverableError, type Job } from 'bullmq';

export abstract class ScaffoldProcessor extends WorkerHost {
  protected abstract readonly processorName: string;
  protected readonly logger = new Logger(ScaffoldProcessor.name);

  async process(job: Job): Promise<never> {
    const message = `${this.processorName} is scaffolded but not implemented (job ${job.id}).`;
    this.logger.error(message);
    throw new UnrecoverableError(message);
  }
}
