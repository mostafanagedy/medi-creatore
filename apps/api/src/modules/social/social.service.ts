import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialPlatform } from '@prisma/client';
// Optional: Encryption service to encrypt/decrypt tokens

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Generate Auth URL for the user to grant permissions
  async generateAuthUrl(platform: SocialPlatform, organizationId: string): Promise<string> {
    // In a real implementation, you would use googleapis or facebook sdk here
    // e.g. return oauth2Client.generateAuthUrl({ access_type: 'offline', scope: [...] });
    const redirectUri = `http://localhost:3000/api/v1/social/callback/${platform.toLowerCase()}`;
    return `https://mock-oauth.com/authorize?client_id=mock&redirect_uri=${redirectUri}&state=${organizationId}`;
  }

  // 2. Handle Callback and Save Token
  async handleCallback(platform: SocialPlatform, organizationId: string, code: string) {
    // Exchange code for tokens
    const mockAccessToken = `mock_access_token_${code}`;
    const mockRefreshToken = `mock_refresh_token_${code}`;
    
    // Encrypt tokens before saving (using a dummy encryption here)
    const accessTokenEnc = Buffer.from(mockAccessToken).toString('base64');
    const refreshTokenEnc = Buffer.from(mockRefreshToken).toString('base64');

    const accountId = `mock_account_id_${Date.now()}`;

    // Upsert the social account in the database
    const account = await this.prisma.socialAccount.upsert({
      where: {
        organizationId_platform_accountId: {
          organizationId,
          platform,
          accountId,
        },
      },
      update: {
        accessTokenEnc,
        refreshTokenEnc,
        isActive: true,
        isExpired: false,
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        platform,
        accountId,
        username: `user_${platform}`,
        displayName: `My ${platform} Account`,
        accessTokenEnc,
        refreshTokenEnc,
      },
    });

    return account;
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

  // 4. Disconnect Account
  async disconnectAccount(organizationId: string, accountId: string) {
    await this.prisma.socialAccount.deleteMany({
      where: { id: accountId, organizationId },
    });
    return { success: true };
  }

  // 5. Publish Post (Adds to Queue)
  async publishPost(organizationId: string, userId: string, accountId: string, content: any, videoUrl?: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, organizationId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException('Social account not found or not active');
    }

    // Create a Post record in DRAFT/SCHEDULED state
    const post = await this.prisma.socialPost.create({
      data: {
        organizationId,
        createdByUserId: userId,
        accountId: account.id,
        content: content,
        mediaUrls: videoUrl ? [videoUrl] : [],
        status: 'QUEUED', // Usually pushed to a BullMQ queue here
      },
    });

    // TODO: Add job to BullMQ queue e.g. `this.socialQueue.add('publish', { postId: post.id })`
    
    return post;
  }
}
