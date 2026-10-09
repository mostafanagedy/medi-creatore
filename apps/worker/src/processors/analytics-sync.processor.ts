import { Processor } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queues/queue-names';
import { ScaffoldProcessor } from './scaffold.processor';

@Processor(QUEUE_NAMES.ANALYTICS_SYNC)
export class AnalyticsSyncProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Analytics sync';
}
