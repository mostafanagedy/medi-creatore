import { Processor } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queues/queue-names';
import { ScaffoldProcessor } from './scaffold.processor';

@Processor(QUEUE_NAMES.CONTENT_REPURPOSING)
export class ContentRepurposingProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Content repurposing';
}
