import { Processor } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queues/queue-names';
import { ScaffoldProcessor } from './scaffold.processor';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Notifications';
}
