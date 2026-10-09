import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialPlatform } from '@prisma/client';
// Optional: Encryption service to encrypt/decrypt tokens

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Generate Auth URL for the user to grant permissions
  async generateAuthUrl(platform: SocialPlatform, organizationId: string): Promise<string> {
    void platform;
    void organizationId;
    throw new ServiceUnavailableException('Social OAuth credentials are not configured.');
  }

  // 2. Handle Callback and Save Token
  async handleCallback(platform: SocialPlatform, organizationId: string, code: string) {
    void platform;
    void organizationId;
    void code;
    throw new ServiceUnavailableException('Social OAuth credentials are not configured.');
  }

  // 3. List Connected Accounts
  async listConnectedAccounts(organizationId: string) {
    return this.prisma.socialAccount.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isExpired: true,
      },
    });
  }

  listPosts(organizationId: string) {
    return this.prisma.socialPost.findMany({
      where: { organizationId },
      include: {
        socialAccount: { select: { displayName: true, username: true } },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 100,
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

  // 4. Disconnect Account
  async disconnectAccount(organizationId: string, accountId: string) {
    await this.prisma.socialAccount.deleteMany({
      where: { id: accountId, organizationId },
    });
    return { success: true };
  }

  // 5. Publish Post (Adds to Queue)
  async publishPost(
    organizationId: string,
    userId: string,
    accountId: string,
    caption: string,
    videoUrl?: string,
    scheduledAt?: Date,
  ) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, organizationId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException('Social account not found or not active');
    }

    // Store scheduled content; a publishing worker must be configured to send it.
    const post = await this.prisma.socialPost.create({
      data: {
        organizationId,
        createdByUserId: userId,
        socialAccountId: account.id,
        platform: account.platform,
        caption,
        mediaUrls: videoUrl ? [videoUrl] : [],
        status: 'SCHEDULED',
        scheduledAt,
      },
    });
    return post;
  }
}
