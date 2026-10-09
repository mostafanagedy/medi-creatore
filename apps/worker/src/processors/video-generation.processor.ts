import { Processor } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queues/queue-names';
import { ScaffoldProcessor } from './scaffold.processor';

@Processor(QUEUE_NAMES.VIDEO_GENERATION)
export class VideoGenerationProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Video generation';
}
