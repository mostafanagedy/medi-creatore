import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UnrecoverableError, type Job, type Queue } from 'bullmq';
import type { VideoGenerationJobData } from '@ai-content-os/types/worker-jobs';
import { QUEUE_NAMES } from '../queues/queue-names';
import { PrismaService } from '../prisma/prisma.service';
import { RunwayVideoClient } from './runway-video.client';
import { ReplicateVideoClient } from './replicate-video.client';

@Processor(QUEUE_NAMES.VIDEO_GENERATION)
export class VideoGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoGenerationProcessor.name);
  private readonly pollIntervalMs = 10_000;
  private readonly maxWaitMs = 30 * 60_000;
  private readonly maxPollAttempts = Math.ceil(this.maxWaitMs / this.pollIntervalMs);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runway: RunwayVideoClient,
    private readonly replicate: ReplicateVideoClient,
    @InjectQueue(QUEUE_NAMES.VIDEO_GENERATION)
    private readonly videoQueue: Queue<VideoGenerationJobData>,
  ) {
    super();
  }

  async process(job: Job<VideoGenerationJobData>) {
    try {
      if (job.data.action === 'generate') {
        return await this.startGeneration(job.data);
      }
      return await this.pollGeneration(job.data);
    } catch (error) {
      if (
        error instanceof UnrecoverableError ||
        job.attemptsMade + 1 >= (job.opts.attempts ?? 1)
      ) {
        await this.failAndRefund(
          job.data.videoId,
          job.data.userId,
          job.data.creditsCharged,
          error,
        );
      }
      throw error;
    }
  }

  private async startGeneration(
    data: Extract<VideoGenerationJobData, { action: 'generate' }>,
  ) {
    const video = await this.prisma.video.findFirst({
      where: { id: data.videoId, createdByUserId: data.userId },
      select: { status: true, metadata: true },
    });
    if (!video || video.status === 'COMPLETED' || video.status === 'FAILED' || video.status === 'CANCELLED') {
      return { status: video?.status ?? 'missing' };
    }

    const existingTaskId = this.getProviderTaskId(video.metadata);
    let providerTaskId = existingTaskId;
    let providerName = (this.asMetadata(video.metadata).provider as string) || (this.replicate.isAvailable ? 'replicate' : 'runwayml');

    if (!providerTaskId) {
      const useReplicate = this.replicate.isAvailable;
      try {
        if (useReplicate) {
          providerName = 'replicate';
          providerTaskId = await this.replicate.createTask(data.input);
        } else {
          providerName = 'runwayml';
          providerTaskId = await this.runway.createTask(data.input);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isExternalProviderError =
          errMsg.includes('not have enough credits') ||
          errMsg.includes('Insufficient credit') ||
          errMsg.includes('credits') ||
          errMsg.includes('not configured') ||
          errMsg.includes('key_') ||
          errMsg.includes('Runway') ||
          errMsg.includes('Replicate');

        const allowMock = process.env.NODE_ENV !== 'production' || process.env.ENABLE_MOCK_AI === 'true';
        if (allowMock && isExternalProviderError) {
          this.logger.warn(`External video generation failed (${errMsg}). Falling back to mock demo video.`);
          providerTaskId = `mock-task-${Date.now()}`;
          providerName = 'mock';
        } else {
          throw err;
        }
      }
    }

    await this.prisma.video.update({
      where: { id: data.videoId },
      data: {
        status: 'PROCESSING',
        metadata: {
          ...this.asMetadata(video.metadata),
          provider: providerName,
          providerTaskId,
        },
      },
    });

    await this.schedulePoll(data, providerTaskId, 0);
    return { status: 'processing', providerTaskId };
  }

  private async pollGeneration(
    data: Extract<VideoGenerationJobData, { action: 'poll' }>,
  ) {
    const video = await this.prisma.video.findFirst({
      where: { id: data.videoId, createdByUserId: data.userId },
      select: { status: true, metadata: true },
    });
    if (!video || video.status === 'COMPLETED' || video.status === 'FAILED' || video.status === 'CANCELLED') {
      return { status: video?.status ?? 'missing' };
    }

    const elapsed = Date.now() - data.startedAt;
    if (elapsed >= this.maxWaitMs || data.pollAttempt >= this.maxPollAttempts) {
      throw new UnrecoverableError('Video generation exceeded the maximum processing time.');
    }

    // Handle Mock demo generation in development
    if (data.providerTaskId.startsWith('mock-task-')) {
      if (data.pollAttempt < 1) {
        await this.prisma.video.updateMany({
          where: { id: data.videoId, status: { in: ['QUEUED', 'PROCESSING'] } },
          data: {
            status: 'PROCESSING',
            metadata: {
              ...this.asMetadata(video.metadata),
              provider: 'mock',
              providerTaskId: data.providerTaskId,
              progress: 60,
            },
          },
        });
        await this.schedulePoll(data, data.providerTaskId, data.pollAttempt + 1);
        return { status: 'processing', progress: 60 };
      }

      const demoUrl = '/videos/flower-demo.mp4';
      await this.prisma.video.updateMany({
        where: { id: data.videoId, status: { in: ['QUEUED', 'PROCESSING'] } },
        data: {
          status: 'COMPLETED',
          fileUrl: demoUrl,
          errorMessage: null,
          metadata: {
            ...this.asMetadata(video.metadata),
            provider: 'mock',
            providerTaskId: data.providerTaskId,
            progress: 100,
          },
        },
      });
      return { status: 'completed', videoUrl: demoUrl };
    }

    const metaProvider = this.asMetadata(video.metadata).provider as string | undefined;
    const currentProvider =
      metaProvider ||
      (data.providerTaskId.includes('runway') ? 'runwayml' : (this.replicate.isAvailable ? 'replicate' : 'runwayml'));
    const result = currentProvider === 'replicate'
      ? await this.replicate.getTaskStatus(data.providerTaskId)
      : await this.runway.getTaskStatus(data.providerTaskId);

    if (result.status === 'completed') {
      await this.prisma.video.updateMany({
        where: { id: data.videoId, status: { in: ['QUEUED', 'PROCESSING'] } },
        data: {
          status: 'COMPLETED',
          fileUrl: result.videoUrl,
          errorMessage: null,
          metadata: {
            ...this.asMetadata(video.metadata),
            provider: currentProvider,
            providerTaskId: data.providerTaskId,
            progress: 100,
          },
        },
      });
      return { status: 'completed', videoUrl: result.videoUrl };
    }

    if (result.status === 'failed') {
      throw new UnrecoverableError(result.errorMessage);
    }

    await this.prisma.video.updateMany({
      where: { id: data.videoId, status: { in: ['QUEUED', 'PROCESSING'] } },
      data: {
        status: 'PROCESSING',
        metadata: {
          ...this.asMetadata(video.metadata),
          provider: currentProvider,
          providerTaskId: data.providerTaskId,
          progress: result.progress ?? null,
        },
      },
    });

    await this.schedulePoll(
      data,
      data.providerTaskId,
      data.pollAttempt + 1,
    );
    return { status: result.status };
  }

  private async schedulePoll(
    data: Pick<VideoGenerationJobData, 'videoId' | 'userId' | 'startedAt' | 'creditsCharged'>,
    providerTaskId: string,
    pollAttempt: number,
  ) {
    const pollJob: VideoGenerationJobData = {
      action: 'poll',
      videoId: data.videoId,
      userId: data.userId,
      providerTaskId,
      startedAt: data.startedAt,
      pollAttempt,
      creditsCharged: data.creditsCharged,
    };
    await this.videoQueue.add('poll-video', pollJob, {
      delay: this.pollIntervalMs,
      jobId: `video-poll-${data.videoId}-${pollAttempt}`,
    });
  }

  private async failAndRefund(
    videoId: string,
    userId: string,
    creditsCharged: number,
    error: unknown,
  ) {
    if (!Number.isSafeInteger(creditsCharged) || creditsCharged <= 0) {
      throw new Error(`Cannot refund video ${videoId}: invalid charged credit amount.`);
    }
    const errorMessage = (error instanceof Error ? error.message : 'Video generation failed.').slice(0, 1_000);
    const refunded = await this.prisma.$transaction(async (tx) => {
      const result = await tx.video.updateMany({
        where: { id: videoId, status: { in: ['QUEUED', 'PROCESSING'] } },
        data: { status: 'FAILED', errorMessage },
      });
      if (!result.count) return false;

      const wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (!wallet) throw new Error(`Cannot refund video ${videoId}: credit wallet not found.`);

      const updatedWallet = await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: creditsCharged },
          totalRefunded: { increment: creditsCharged },
        },
      });
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REFUND',
          amount: creditsCharged,
          balance: updatedWallet.balance,
          description: 'Refund: video generation failed',
          referenceType: 'video_generation',
          referenceId: videoId,
        },
      });
      return true;
    });

    if (refunded) this.logger.error(`Video generation failed for video ${videoId}: ${errorMessage}`);
  }

  private getProviderTaskId(metadata: unknown): string | undefined {
    const value = this.asMetadata(metadata).providerTaskId;
    return typeof value === 'string' ? value : undefined;
  }

  private asMetadata(metadata: unknown): Record<string, string | number | null> {
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return {};
    return metadata as Record<string, string | number | null>;
  }
}
