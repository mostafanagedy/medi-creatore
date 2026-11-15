import { Processor } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queues/queue-names';
import { ScaffoldProcessor } from './scaffold.processor';

@Processor(QUEUE_NAMES.VIDEO_RENDERING)
export class VideoRenderingProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Video rendering';
}
