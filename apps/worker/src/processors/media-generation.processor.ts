import { Processor } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queues/queue-names';
import { ScaffoldProcessor } from './scaffold.processor';

@Processor(QUEUE_NAMES.AUDIO_GENERATION)
export class AudioGenerationProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Audio generation';
}

@Processor(QUEUE_NAMES.IMAGE_GENERATION)
export class ImageGenerationProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Image generation';
}

@Processor(QUEUE_NAMES.TRANSCRIPTION)
export class TranscriptionProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Transcription';
}

@Processor(QUEUE_NAMES.CAPTION_GENERATION)
export class CaptionGenerationProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Caption generation';
}

@Processor(QUEUE_NAMES.THUMBNAIL_GENERATION)
export class ThumbnailGenerationProcessor extends ScaffoldProcessor {
  protected readonly processorName = 'Thumbnail generation';
}
