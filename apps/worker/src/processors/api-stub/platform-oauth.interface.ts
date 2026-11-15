import { SocialPlatform } from '@prisma/client';

export interface PlatformTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
}

export interface PlatformAccountInfo {
  platformAccountId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  followerCount?: number;
  metadata?: Record<string, unknown>;
}

export interface PublishPayload {
  caption: string;
  mediaUrls?: string[];
  scheduledAt?: string;
  hashtags?: string[];
  options?: Record<string, unknown>;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface IPlatformOAuthAdapter {
  readonly platform: SocialPlatform;
  refreshAccessToken(refreshToken: string): Promise<PlatformTokens>;
  publish(accessToken: string, payload: PublishPayload): Promise<PublishResult>;
}
