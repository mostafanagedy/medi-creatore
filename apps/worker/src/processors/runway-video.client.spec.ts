import { ConfigService } from '@nestjs/config';
import { UnrecoverableError } from 'bullmq';
import { RunwayVideoClient } from './runway-video.client';

describe('RunwayVideoClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('submits a supported generation request with the configured provider key', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'runway-task-1' }), { status: 200 }),
    );
    const client = new RunwayVideoClient({
      get: jest.fn().mockReturnValue('runway-secret'),
    } as unknown as ConfigService);

    await expect(client.createTask({
      prompt: 'A sunrise over the sea',
      durationSec: 10,
      aspectRatio: '9:16',
      style: 'cinematic',
    })).resolves.toBe('runway-task-1');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.runwayml.com/v1/image_to_video',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer runway-secret',
          'X-Runway-Version': '2024-09-13',
        }),
        body: JSON.stringify({
          model: 'gen3a_turbo',
          promptText: 'A sunrise over the sea\nStyle and camera direction: cinematic',
          duration: 10,
          ratio: '768:1280',
        }),
      }),
    );
  });

  it('rejects unsupported input before contacting the provider', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    const client = new RunwayVideoClient({
      get: jest.fn().mockReturnValue('runway-secret'),
    } as unknown as ConfigService);

    await expect(client.createTask({
      prompt: 'A sunrise',
      aspectRatio: '1:1',
    })).rejects.toBeInstanceOf(UnrecoverableError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps completed provider tasks to a result URL', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        status: 'SUCCEEDED',
        output: ['https://cdn.example.test/video.mp4'],
      }), { status: 200 }),
    );
    const client = new RunwayVideoClient({
      get: jest.fn().mockReturnValue('runway-secret'),
    } as unknown as ConfigService);

    await expect(client.getTaskStatus('runway-task-1')).resolves.toEqual({
      status: 'completed',
      videoUrl: 'https://cdn.example.test/video.mp4',
    });
  });

  it('does not expose raw provider response details in terminal API errors', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('sensitive provider response', { status: 401 }),
    );
    const client = new RunwayVideoClient({
      get: jest.fn().mockReturnValue('runway-secret'),
    } as unknown as ConfigService);

    await expect(client.getTaskStatus('runway-task-1')).rejects.toThrow(
      'Runway request failed with status 401.',
    );
  });
});
