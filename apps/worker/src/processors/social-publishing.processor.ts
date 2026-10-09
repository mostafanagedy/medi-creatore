import { Processor } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queues/queue-names';
import { ScaffoldProcessor } from './scaffold.processor';

@Processor(QUEUE_NAMES.SOCIAL_PUBLISHING)
export class SocialPublishingProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Social publishing';
}
