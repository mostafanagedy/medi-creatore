import { QUEUE_NAMES } from './queue-names';

describe('QUEUE_NAMES', () => {
  it('contains every queue in the architecture', () => {
    expect(Object.values(QUEUE_NAMES)).toEqual([
      'video-generation',
      'video-rendering',
      'audio-generation',
      'image-generation',
      'transcription',
      'caption-generation',
      'social-publishing',
      'analytics-sync',
      'thumbnail-generation',
      'content-repurposing',
      'notifications',
    ]);
  });
});
