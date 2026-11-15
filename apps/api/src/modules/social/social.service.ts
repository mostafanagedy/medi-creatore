import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SocialPlatform, PostStatus } from '@prisma/client';
import { PlatformRegistryService } from './platforms/platform-registry.service';
import {
  encryptSecret,
  decryptSecret,
  serializeEncryptedPayload,
  deserializeEncryptedPayload,
  generateSecureToken,
} from '../../common/security/security.util';
import { QUEUE_NAMES } from '../../queues/queue-names';

interface OAuthStatePayload {
  organizationId: string;
  userId: string;
  platform: SocialPlatform;
  nonce: string;
}

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  private readonly encryptionKey: string;
  private readonly apiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly platformRegistry: PlatformRegistryService,
    @InjectQueue(QUEUE_NAMES.SOCIAL_PUBLISHING) private readonly publishQueue: Queue,
  ) {
    this.encryptionKey = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    this.apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:3001';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OAuth Flow
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Build an authorization URL for the given platform.
   * Encodes a signed, encrypted state to prevent CSRF.
   */
  async generateAuthUrl(platform: SocialPlatform, organizationId: string, userId: string): Promise<string> {
    const adapter = this.platformRegistry.getAdapter(platform);
    const redirectUri = this.buildRedirectUri(platform);

    const statePayload: OAuthStatePayload = {
      organizationId,
      userId,
      platform,
      nonce: generateSecureToken(16),
    };

    const stateJson = JSON.stringify(statePayload);
    const encrypted = encryptSecret(stateJson, this.encryptionKey);
    const state = Buffer.from(JSON.stringify(encrypted)).toString('base64url');

    return adapter.buildAuthUrl(state, redirectUri);
  }

  /**
   * Handle the OAuth callback from the platform.
   * Decodes state, exchanges code for tokens, fetches account info, saves to DB.
   */
  async handleCallback(platform: SocialPlatform, code: string, state: string) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    // Decode and verify state
    let statePayload: OAuthStatePayload;
    try {
      const stateJson = Buffer.from(state, 'base64url').toString('utf-8');
      const encryptedPayload = JSON.parse(stateJson) as {
        ciphertext: string;
        iv: string;
        tag: string;
      };
      const decrypted = decryptSecret(encryptedPayload, this.encryptionKey);
      statePayload = JSON.parse(decrypted) as OAuthStatePayload;
    } catch {
      throw new ForbiddenException('Invalid or tampered OAuth state');
    }

    if (statePayload.platform !== platform) {
      throw new ForbiddenException('Platform mismatch in OAuth state');
    }

    const { organizationId, userId } = statePayload;
    const adapter = this.platformRegistry.getAdapter(platform);
    const redirectUri = this.buildRedirectUri(platform);

    // Exchange code for tokens
    const tokens = await adapter.exchangeCode(code, redirectUri);

    // Fetch account info from the platform
    const accountInfo = await adapter.fetchAccountInfo(tokens.accessToken);

    // Encrypt tokens before storage
    const encryptedAccessToken = serializeEncryptedPayload(
      encryptSecret(tokens.accessToken, this.encryptionKey),
    );
    const encryptedRefreshToken = tokens.refreshToken
      ? serializeEncryptedPayload(encryptSecret(tokens.refreshToken, this.encryptionKey))
      : null;

    // Upsert social account — one platform account per org
    const account = await this.prisma.socialAccount.upsert({
      where: {
        organizationId_platform_accountId: {
          organizationId,
          platform,
          accountId: accountInfo.platformAccountId,
        },
      },
      create: {
        organizationId,
        platform,
        accountId: accountInfo.platformAccountId,
        username: accountInfo.username,
        displayName: accountInfo.displayName,
        avatarUrl: accountInfo.avatarUrl,
        followerCount: accountInfo.followerCount,
        accessTokenEnc: encryptedAccessToken,
        refreshTokenEnc: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
        scope: tokens.scope ?? '',
        isActive: true,
        isExpired: false,
        metadata: (accountInfo.metadata as Prisma.InputJsonValue) ?? {},
      },
      update: {
        username: accountInfo.username,
        displayName: accountInfo.displayName,
        avatarUrl: accountInfo.avatarUrl,
        followerCount: accountInfo.followerCount,
        accessTokenEnc: encryptedAccessToken,
        refreshTokenEnc: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
        scope: tokens.scope ?? '',
        isActive: true,
        isExpired: false,
        metadata: (accountInfo.metadata as Prisma.InputJsonValue) ?? {},
      },
    });

    this.logger.log(`Connected ${platform} account "${accountInfo.username}" for org ${organizationId}`);
    return account;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Token Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Decrypts and returns access token for a social account.
   * Auto-refreshes if expiry is within 5 minutes.
   */
  async getDecryptedAccessToken(accountId: string): Promise<string> {
    const account = await this.prisma.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
    });

    const fiveMinutesMs = 5 * 60 * 1000;
    const isNearExpiry =
      account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < fiveMinutesMs;

    if (isNearExpiry && account.refreshTokenEnc) {
      return this.refreshAndGetToken(account);
    }

    if (!account.accessTokenEnc) {
      throw new Error(`Social account ${accountId} has no stored access token`);
    }

    return decryptSecret(
      deserializeEncryptedPayload(account.accessTokenEnc),
      this.encryptionKey,
    );
  }

  private async refreshAndGetToken(account: {
    id: string;
    platform: SocialPlatform;
    refreshTokenEnc: string | null;
  }): Promise<string> {
    if (!account.refreshTokenEnc) throw new Error('No refresh token available');

    const adapter = this.platformRegistry.getAdapter(account.platform);
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

    this.logger.log(`Refreshed token for social account ${account.id}`);
    return newTokens.accessToken;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Account Management
  // ─────────────────────────────────────────────────────────────────────────────

  async listConnectedAccounts(organizationId: string) {
    return this.prisma.socialAccount.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        followerCount: true,
        isExpired: true,
        tokenExpiresAt: true,
        scope: true,
        createdAt: true,
      },
    });
  }

  async disconnectAccount(organizationId: string, accountId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, organizationId },
    });
    if (!account) throw new NotFoundException('Social account not found');

    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false, accessTokenEnc: '', refreshTokenEnc: null },
    });

    this.logger.log(`Disconnected social account ${accountId} from org ${organizationId}`);
    return { success: true };
  }

  getSupportedPlatforms() {
    return this.platformRegistry.getSupportedPlatforms();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Posts & Publishing
  // ─────────────────────────────────────────────────────────────────────────────

  listPosts(organizationId: string, limit = 100, cursor?: string) {
    return this.prisma.socialPost.findMany({
      where: { organizationId },
      include: {
        socialAccount: { select: { displayName: true, username: true, platform: true } },
        publishingJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  async getPostAnalytics(organizationId: string) {
    const where = { organizationId };
    const [total, byPlatform, byStatus] = await Promise.all([
      this.prisma.socialPost.count({ where }),
      this.prisma.socialPost.groupBy({
        by: ['platform'],
        where,
        _count: { _all: true },
      }),
      this.prisma.socialPost.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);
    return {
      total,
      platforms: byPlatform.map((item) => ({ platform: item.platform, count: item._count._all })),
      statuses: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
    };
  }

  /**
   * Create a scheduled post and enqueue it for publishing.
   * If scheduledAt is in the past or not set, publishes immediately.
   */
  async createAndSchedulePost(
    organizationId: string,
    userId: string,
    accountId: string,
    caption: string,
    mediaUrls?: string[],
    scheduledAt?: Date,
    options?: Record<string, unknown>,
  ) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, organizationId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException('Social account not found or not active');
    }

    if (!this.platformRegistry.isSupported(account.platform)) {
      throw new BadRequestException(
        `Platform "${account.platform}" is not currently supported for publishing`,
      );
    }

    const isImmediate = !scheduledAt || scheduledAt <= new Date();
    const effectiveStatus: PostStatus = 'SCHEDULED';

    // Create the post record
    const post = await this.prisma.socialPost.create({
      data: {
        organizationId,
        createdByUserId: userId,
        socialAccountId: account.id,
        platform: account.platform,
        caption,
        mediaUrls: mediaUrls ?? [],
        status: 'SCHEDULED',
        scheduledAt: scheduledAt ?? new Date(),
        metadata: (options ? { publishOptions: options } : {}) as Prisma.InputJsonValue,
      },
    });

    // Create a publishing job record
    const job = await this.prisma.publishingJob.create({
      data: {
        socialPostId: post.id,
        scheduledFor: scheduledAt ?? new Date(),
        status: 'PENDING',
        maxAttempts: 5,
      },
    });

    // Calculate BullMQ delay in milliseconds
    const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;

    // Enqueue the publishing job using shared queue schema
    await this.publishQueue.add(
      'publish-post',
      {
        type: 'social:publish',
        socialPostId: post.id,
        publishingJobId: job.id,
        userId,
        organizationId,
        attemptNumber: 1,
        scheduledAt: scheduledAt?.toISOString(),
      },
      {
        delay,
        jobId: `publish-${post.id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 }, // 1min, 2min, 4min, 8min, 16min
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    );

    this.logger.log(
      `Post ${post.id} scheduled for ${account.platform} at ${scheduledAt?.toISOString() ?? 'now'} (delay: ${delay}ms)`,
    );

    return { post, job };
  }

  /**
   * Cancel a pending post and remove it from the queue.
   */
  async cancelPost(organizationId: string, postId: string) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, organizationId },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== 'SCHEDULED') {
      throw new BadRequestException(`Cannot cancel a post with status "${post.status}"`);
    }

    // Remove from BullMQ
    const bullJob = await this.publishQueue.getJob(`publish-${postId}`);
    if (bullJob) {
      await bullJob.remove();
    }

    await this.prisma.socialPost.update({
      where: { id: postId },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private buildRedirectUri(platform: SocialPlatform): string {
    return `${this.apiUrl}/api/v1/social/callback/${platform.toLowerCase()}`;
  }
}
