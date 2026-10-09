import { UnrecoverableError } from 'bullmq';
import type { Job } from 'bullmq';
import { VideoGenerationProcessor } from './video-generation.processor';

describe('VideoGenerationProcessor', () => {
  it('fails unsupported jobs explicitly instead of acknowledging them as complete', async () => {
    const processor = new VideoGenerationProcessor();
    const job = { id: 'video-job-1' } as Job;

    await expect(processor.process(job)).rejects.toBeInstanceOf(UnrecoverableError);
  });
});
