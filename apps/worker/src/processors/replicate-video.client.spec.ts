import { ConfigService } from '@nestjs/config';
import { UnrecoverableError } from 'bullmq';
import { ReplicateVideoClient } from './replicate-video.client';

describe('ReplicateVideoClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('submits a generation request to Replicate wan-3 model', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'replicate-pred-1' }), { status: 201 }),
    );
    const client = new ReplicateVideoClient({
      get: jest.fn().mockImplementation((key: string, def?: string) => (key === 'REPLICATE_API_TOKEN' ? 'r8_testtoken' : def)),
    } as unknown as ConfigService);

    await expect(client.createTask({
      prompt: 'A turtle swimming through a library',
      durationSec: 5,
      aspectRatio: '16:9',
    })).resolves.toBe('replicate-pred-1');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.replicate.com/v1/models/alibaba/wan-3/predictions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer r8_testtoken',
          Prefer: 'respond-async',
        }),
        body: JSON.stringify({
          input: {
            prompt: 'A turtle swimming through a library',
            duration: 5,
            aspect_ratio: '16:9',
            resolution: '720p',
          },
        }),
      }),
    );
  });

  it('throws UnrecoverableError if REPLICATE_API_TOKEN is missing', async () => {
    const client = new ReplicateVideoClient({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await expect(client.createTask({
      prompt: 'A turtle swimming',
    })).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('maps succeeded prediction to completed status with video URL', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        id: 'replicate-pred-1',
        status: 'succeeded',
        output: 'https://replicate.delivery/output.mp4',
      }), { status: 200 }),
    );
    const client = new ReplicateVideoClient({
      get: jest.fn().mockReturnValue('r8_testtoken'),
    } as unknown as ConfigService);

    await expect(client.getTaskStatus('replicate-pred-1')).resolves.toEqual({
      status: 'completed',
      videoUrl: 'https://replicate.delivery/output.mp4',
    });
  });

  it('maps array output from prediction to the first video URL', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        id: 'replicate-pred-1',
        status: 'succeeded',
        output: ['https://replicate.delivery/output.mp4'],
      }), { status: 200 }),
    );
    const client = new ReplicateVideoClient({
      get: jest.fn().mockReturnValue('r8_testtoken'),
    } as unknown as ConfigService);

    await expect(client.getTaskStatus('replicate-pred-1')).resolves.toEqual({
      status: 'completed',
      videoUrl: 'https://replicate.delivery/output.mp4',
    });
  });

  it('maps failed prediction to failed status with error message', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        id: 'replicate-pred-1',
        status: 'failed',
        error: 'NSFW content detected',
      }), { status: 200 }),
    );
    const client = new ReplicateVideoClient({
      get: jest.fn().mockReturnValue('r8_testtoken'),
    } as unknown as ConfigService);

    await expect(client.getTaskStatus('replicate-pred-1')).resolves.toEqual({
      status: 'failed',
      errorMessage: 'NSFW content detected',
    });
  });
});
