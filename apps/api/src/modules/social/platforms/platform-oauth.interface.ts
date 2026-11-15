import { SocialPlatform } from '@prisma/client';

/**
 * Standardized OAuth token returned after exchanging an authorization code.
 */
export interface PlatformTokens {
  accessToken: string;
  refreshToken?: string;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
}

/**
 * Minimal account info fetched from the platform after OAuth.
 */
export interface PlatformAccountInfo {
  platformAccountId: string; // unique ID on that platform
  username: string;
  displayName: string;
  avatarUrl?: string;
  followerCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Payload passed to the publisher when pushing a post.
 */
export interface PublishPayload {
  caption: string;
  mediaUrls?: string[];
  /** ISO 8601 — only some platforms support native scheduling */
  scheduledAt?: string;
  hashtags?: string[];
  /** Platform-specific options (e.g. TikTok privacy level) */
  options?: Record<string, unknown>;
}

/**
 * Normalized result from a publish attempt.
 */
export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

/**
 * Contract every platform adapter must fulfill.
 */
export interface IPlatformOAuthAdapter {
  readonly platform: SocialPlatform;

  /** Build the authorization URL the user is redirected to */
  buildAuthUrl(state: string, redirectUri: string): string;

  /** Exchange authorization code for tokens */
  exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens>;

  /** Use a refresh token to get a new access token */
  refreshAccessToken(refreshToken: string): Promise<PlatformTokens>;

  /** Fetch account profile from the platform */
  fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo>;

  /** Push a post to the platform */
  publish(accessToken: string, payload: PublishPayload): Promise<PublishResult>;
}
