import type { Job } from 'bullmq';
import type { Queue } from 'bullmq';
import type { VideoGenerationJobData } from '@ai-content-os/types/worker-jobs';
import { PrismaService } from '../prisma/prisma.service';
import { VideoGenerationProcessor } from './video-generation.processor';
import { RunwayVideoClient } from './runway-video.client';

describe('VideoGenerationProcessor', () => {
  it('ignores jobs when their owning video record no longer exists', async () => {
    const prisma = {
      video: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const queue = { add: jest.fn() } as unknown as Queue<VideoGenerationJobData>;
    const processor = new VideoGenerationProcessor(
      prisma,
      {} as RunwayVideoClient,
      queue,
    );
    const job = {
      id: 'video-job-1',
      data: {
        action: 'generate',
        videoId: 'video-id',
        userId: 'user-id',
        input: { prompt: 'test' },
        startedAt: Date.now(),
        creditsCharged: 50,
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as Job<VideoGenerationJobData>;

    await expect(processor.process(job)).resolves.toEqual({ status: 'missing' });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('submits queued videos and schedules asynchronous provider polling', async () => {
    const prisma = {
      video: {
        findFirst: jest.fn().mockResolvedValue({ status: 'QUEUED', metadata: null }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const runway = {
      createTask: jest.fn().mockResolvedValue('runway-task-1'),
    } as unknown as RunwayVideoClient;
    const queue = { add: jest.fn().mockResolvedValue({}) } as unknown as Queue<VideoGenerationJobData>;
    const processor = new VideoGenerationProcessor(prisma, runway, queue);
    const jobData: Extract<VideoGenerationJobData, { action: 'generate' }> = {
      action: 'generate',
      videoId: 'video-id',
      userId: 'user-id',
      input: { prompt: 'A sunrise over the sea' },
      startedAt: Date.now(),
      creditsCharged: 50,
    };
    const job = {
      id: 'video-job-1',
      data: jobData,
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as Job<VideoGenerationJobData>;

    await expect(processor.process(job)).resolves.toMatchObject({
      status: 'processing',
      providerTaskId: 'runway-task-1',
    });
    expect(runway.createTask).toHaveBeenCalledWith(jobData.input);
    expect(prisma.video.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'video-id' },
        data: expect.objectContaining({ status: 'PROCESSING' }),
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'poll-video',
      expect.objectContaining({ action: 'poll', providerTaskId: 'runway-task-1' }),
      expect.objectContaining({ delay: 10_000 }),
    );
  });

  it('persists completed video URLs from provider polling', async () => {
    const prisma = {
      video: {
        findFirst: jest.fn().mockResolvedValue({ status: 'PROCESSING', metadata: { providerTaskId: 'runway-task-1' } }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;
    const runway = {
      getTaskStatus: jest.fn().mockResolvedValue({
        status: 'completed',
        videoUrl: 'https://cdn.example.test/video.mp4',
      }),
    } as unknown as RunwayVideoClient;
    const queue = { add: jest.fn() } as unknown as Queue<VideoGenerationJobData>;
    const processor = new VideoGenerationProcessor(prisma, runway, queue);
    const job = {
      id: 'video-poll-1',
      data: {
        action: 'poll',
        videoId: 'video-id',
        userId: 'user-id',
        providerTaskId: 'runway-task-1',
        startedAt: Date.now(),
        pollAttempt: 1,
        creditsCharged: 50,
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as Job<VideoGenerationJobData>;

    await expect(processor.process(job)).resolves.toEqual({
      status: 'completed',
      videoUrl: 'https://cdn.example.test/video.mp4',
    });
    expect(prisma.video.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'video-id', status: { in: ['QUEUED', 'PROCESSING'] } },
        data: expect.objectContaining({
          status: 'COMPLETED',
          fileUrl: 'https://cdn.example.test/video.mp4',
        }),
      }),
    );
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('refunds the actual charged amount once when provider submission fails', async () => {
    const failedVideo = { status: 'FAILED', metadata: null };
    const tx = {
      video: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      creditWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'wallet-id' }),
        update: jest.fn().mockResolvedValue({ balance: 125 }),
      },
      creditTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      video: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({ status: 'QUEUED', metadata: null })
          .mockResolvedValue(failedVideo),
      },
      $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaService;
    const runway = {
      createTask: jest.fn().mockRejectedValue(new Error('Provider rejected the request')),
    } as unknown as RunwayVideoClient;
    const queue = { add: jest.fn() } as unknown as Queue<VideoGenerationJobData>;
    const processor = new VideoGenerationProcessor(prisma, runway, queue);
    const job = {
      id: 'video-job-1',
      data: {
        action: 'generate',
        videoId: 'video-id',
        userId: 'user-id',
        input: { prompt: 'A sunrise over the sea' },
        startedAt: Date.now(),
        creditsCharged: 75,
      },
      opts: { attempts: 3 },
      attemptsMade: 2,
    } as Job<VideoGenerationJobData>;

    await expect(processor.process(job)).rejects.toThrow('Provider rejected the request');
    await expect(processor.process(job)).resolves.toEqual({ status: 'FAILED' });
    expect(tx.creditWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          balance: { increment: 75 },
          totalRefunded: { increment: 75 },
        },
      }),
    );
    expect(tx.creditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 75 }) }),
    );
    expect(tx.creditWallet.update).toHaveBeenCalledTimes(1);
  });

  it('refunds terminal polling failures only once', async () => {
    const tx = {
      video: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      creditWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'wallet-id' }),
        update: jest.fn().mockResolvedValue({ balance: 100 }),
      },
      creditTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      video: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({ status: 'PROCESSING', metadata: { providerTaskId: 'runway-task-1' } })
          .mockResolvedValue({ status: 'FAILED', metadata: null }),
      },
      $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const runway = {
      getTaskStatus: jest.fn().mockResolvedValue({
        status: 'failed',
        errorMessage: 'Provider rejected the video',
      }),
    } as unknown as RunwayVideoClient;
    const queue = { add: jest.fn() } as unknown as Queue<VideoGenerationJobData>;
    const processor = new VideoGenerationProcessor(prisma, runway, queue);
    const job = {
      id: 'video-poll-1',
      data: {
        action: 'poll',
        videoId: 'video-id',
        userId: 'user-id',
        providerTaskId: 'runway-task-1',
        startedAt: Date.now(),
        pollAttempt: 1,
        creditsCharged: 80,
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as Job<VideoGenerationJobData>;

    await expect(processor.process(job)).rejects.toThrow('Provider rejected the video');
    await expect(processor.process(job)).resolves.toEqual({ status: 'FAILED' });
    expect(tx.creditWallet.update).toHaveBeenCalledTimes(1);
    expect(tx.creditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 80, referenceId: 'video-id' }),
      }),
    );
  });
});
