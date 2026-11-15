import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaClient, SocialPlatform, PostStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  encryptSecret,
  decryptSecret,
  serializeEncryptedPayload,
  deserializeEncryptedPayload,
} from '@ai-content-os/security';
import {
  SocialPublishJobPayload,
} from '@ai-content-os/queues';
import { QUEUE_NAMES } from '../queues/queue-names';

import type {
  IPlatformOAuthAdapter,
  PublishPayload,
} from './api-stub/platform-oauth.interface';
import { PlatformRegistryService } from './platforms/platform-registry.service';
import { MetaOAuthAdapter } from './platforms/meta.adapter';
import { TikTokOAuthAdapter } from './platforms/tiktok.adapter';
import { YouTubeOAuthAdapter } from './platforms/youtube.adapter';

/**
 * Worker-side social publishing processor.
 *
 * Responsibilities:
 *  1. Load the SocialPost + PublishingJob from the DB
 *  2. Resolve + decrypt access token (auto-refresh if expired)
 *  3. Dispatch to the appropriate platform adapter
 *  4. Record result in SocialPostResult
 *  5. Update PublishingJob status (COMPLETED / FAILED)
 *  6. Update SocialPost status accordingly
 */
@Processor(QUEUE_NAMES.SOCIAL_PUBLISHING)
export class SocialPublishingProcessor extends WorkerHost {
  private readonly logger = new Logger(SocialPublishingProcessor.name);
  private readonly prisma: PrismaClient;
  private readonly encryptionKey: string;
  private readonly platformRegistry: PlatformRegistryService;

  constructor(private readonly config: ConfigService) {
    super();
    this.prisma = new PrismaClient();
    this.encryptionKey = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    this.platformRegistry = new PlatformRegistryService(
      new MetaOAuthAdapter(this.config),
      new TikTokOAuthAdapter(this.config),
      new YouTubeOAuthAdapter(this.config),
    );
  }

  async process(job: Job<SocialPublishJobPayload>): Promise<void> {
    const { socialPostId, publishingJobId } = job.data;

    this.logger.log(
      `Processing social publish job ${job.id} for post ${socialPostId} (attempt ${job.attemptsMade + 1})`,
    );

    // Mark job as PROCESSING
    await this.prisma.publishingJob.update({
      where: { id: publishingJobId },
      data: {
        status: 'PROCESSING',
        lastAttemptAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    // Load the post with its social account
    const post = await this.prisma.socialPost.findUnique({
      where: { id: socialPostId },
      include: { socialAccount: true },
    });

    if (!post) {
      this.logger.warn(`Post ${socialPostId} not found — skipping`);
      await this.markJobFailed(publishingJobId, 'POST_NOT_FOUND', 'Social post not found');
      return;
    }

    if (post.status === 'CANCELLED') {
      this.logger.log(`Post ${socialPostId} was cancelled — skipping`);
      await this.markJobFailed(publishingJobId, 'POST_CANCELLED', 'Post was cancelled');
      return;
    }

    const account = post.socialAccount;
    if (!account || !account.isActive) {
      await this.markJobFailed(publishingJobId, 'ACCOUNT_INACTIVE', 'Social account is inactive or disconnected');
      await this.updatePostStatus(socialPostId, 'FAILED');
      return;
    }

    // Resolve and possibly refresh access token
    let accessToken: string;
    try {
      accessToken = await this.resolveAccessToken(account);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Token resolution failed for account ${account.id}: ${msg}`);
      await this.markJobFailed(publishingJobId, 'TOKEN_ERROR', msg);
      await this.updatePostStatus(socialPostId, 'FAILED');
      throw err; // Re-throw to trigger BullMQ retry
    }

    // Get the platform adapter
    const adapter = this.getAdapterForPlatform(account.platform);
    if (!adapter) {
      const msg = `No adapter for platform ${account.platform}`;
      await this.markJobFailed(publishingJobId, 'UNSUPPORTED_PLATFORM', msg);
      await this.updatePostStatus(socialPostId, 'FAILED');
      return;
    }

    // Prepare publish payload
    const metadataObj = post.metadata as Record<string, unknown> | null;
    const publishOptions = (metadataObj?.['publishOptions'] as Record<string, unknown>) ?? {};

    const payload: PublishPayload = {
      caption: post.caption ?? '',
      mediaUrls: post.mediaUrls,
      scheduledAt: post.scheduledAt?.toISOString(),
      hashtags: post.hashtags,
      options: publishOptions,
    };

    // Publish!
    const result = await adapter.publish(accessToken, payload);

    // Record the result
    await this.prisma.socialPostResult.create({
      data: {
        socialPostId: post.id,
        publishingJobId,
        success: result.success,
        status: result.success ? 'success' : 'failed',
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        rawResponse: result.rawResponse ? JSON.stringify(result.rawResponse) : null,
        attemptNumber: job.attemptsMade + 1,
      },
    });

    if (result.success) {
      // Success path
      await this.prisma.publishingJob.update({
        where: { id: publishingJobId },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          platformPostId: result.platformPostId,
        },
      });
      await this.updatePostStatus(socialPostId, 'PUBLISHED', result.platformPostId, result.platformUrl);
      this.logger.log(
        `✅ Post ${socialPostId} published to ${account.platform} — platform ID: ${result.platformPostId}`,
      );
    } else {
      // Failure path — let BullMQ retry if attempts remain
      const maxAttempts = job.opts.attempts ?? 5;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
      if (isFinalAttempt) {
        await this.markJobFailed(publishingJobId, result.errorCode ?? 'PUBLISH_FAILED', result.errorMessage);
        await this.updatePostStatus(socialPostId, 'FAILED');
        this.logger.error(
          `❌ Post ${socialPostId} PERMANENTLY FAILED after ${job.attemptsMade + 1} attempts: ${result.errorMessage}`,
        );
      } else {
        await this.prisma.publishingJob.update({
          where: { id: publishingJobId },
          data: { status: 'RETRYING' },
        });
        this.logger.warn(
          `⚠️ Post ${socialPostId} failed attempt ${job.attemptsMade + 1}: ${result.errorMessage} — will retry`,
        );
        throw new Error(result.errorMessage ?? 'Publishing failed'); // Trigger BullMQ retry
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async resolveAccessToken(account: {
    id: string;
    platform: SocialPlatform;
    accessTokenEnc: string | null;
    refreshTokenEnc: string | null;
    tokenExpiresAt: Date | null;
  }): Promise<string> {
    if (!account.accessTokenEnc) {
      throw new Error(`Account ${account.id} has no stored access token`);
    }

    const fiveMinMs = 5 * 60 * 1000;
    const isNearExpiry =
      account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < fiveMinMs;

    if (isNearExpiry && account.refreshTokenEnc) {
      // Refresh token
      const adapter = this.getAdapterForPlatform(account.platform);
      if (!adapter) throw new Error(`No adapter to refresh ${account.platform}`);

      const refreshToken = decryptSecret(
        deserializeEncryptedPayload(account.refreshTokenEnc),
        this.encryptionKey,
      );
      const newTokens = await adapter.refreshAccessToken(refreshToken);

      const encryptedAccessToken = serializeEncryptedPayload(
        encryptSecret(newTokens.accessToken, this.encryptionKey),
      );
      const encryptedRefreshToken = newTokens.refreshToken
        ? serializeEncryptedPayload(encryptSecret(newTokens.refreshToken, this.encryptionKey))
        : account.refreshTokenEnc;

      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEnc: encryptedAccessToken,
          refreshTokenEnc: encryptedRefreshToken,
          tokenExpiresAt: newTokens.expiresAt ? new Date(newTokens.expiresAt) : null,
          isExpired: false,
        },
      });

      this.logger.log(`Refreshed token for account ${account.id}`);
      return newTokens.accessToken;
    }

    return decryptSecret(
      deserializeEncryptedPayload(account.accessTokenEnc),
      this.encryptionKey,
    );
  }

  private getAdapterForPlatform(platform: SocialPlatform): IPlatformOAuthAdapter | null {
    return this.platformRegistry.getAdapter(platform);
  }

  private async markJobFailed(
    jobId: string,
    errorCode: string,
    errorMessage?: string | null,
  ) {
    await this.prisma.publishingJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorCode,
        errorMessage: errorMessage ?? null,
        completedAt: new Date(),
      },
    });
  }

  private async updatePostStatus(
    postId: string,
    status: PostStatus,
    platformPostId?: string,
    platformUrl?: string,
  ) {
    await this.prisma.socialPost.update({
      where: { id: postId },
      data: {
        status,
        ...(platformPostId ? { platformPostId } : {}),
        ...(platformUrl ? { platformUrl } : {}),
        ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
        ...(status === 'FAILED' ? { failedAt: new Date() } : {}),
      },
    });
  }
}
