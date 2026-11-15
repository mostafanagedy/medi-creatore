import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from '@prisma/client';
import {
  IPlatformOAuthAdapter,
  PlatformTokens,
  PlatformAccountInfo,
  PublishPayload,
  PublishResult,
} from './platform-oauth.interface';

/**
 * TikTok OAuth 2.0 adapter
 *
 * Uses TikTok for Developers — Content Posting API v2
 * Docs: https://developers.tiktok.com/doc/login-kit-web
 *       https://developers.tiktok.com/doc/content-posting-api-get-started
 */
@Injectable()
export class TikTokOAuthAdapter implements IPlatformOAuthAdapter {
  readonly platform = SocialPlatform.TIKTOK;

  private readonly logger = new Logger(TikTokOAuthAdapter.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  private readonly authBaseUrl = 'https://www.tiktok.com/v2/auth/authorize/';
  private readonly tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
  private readonly apiBase = 'https://open.tiktokapis.com/v2';

  private readonly scopes = [
    'user.info.basic',
    'user.info.profile',
    'user.info.stats',
    'video.list',
    'video.publish',
    'video.upload',
  ].join(',');

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('TIKTOK_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('TIKTOK_CLIENT_SECRET') ?? '';
  }

  buildAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_key: this.clientId,
      scope: this.scopes,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    return `${this.authBaseUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const body = new URLSearchParams({
      client_key: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);

    const data = (await res.json()) as {
      data?: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        refresh_expires_in: number;
        scope: string;
        token_type: string;
      };
      error?: string;
      error_description?: string;
    };

    if (data.error || !data.data) {
      throw new Error(`TikTok OAuth error: ${data.error_description ?? data.error}`);
    }

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: Date.now() + data.data.expires_in * 1000,
      scope: data.data.scope,
      tokenType: data.data.token_type,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<PlatformTokens> {
    const body = new URLSearchParams({
      client_key: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) throw new Error(`TikTok token refresh failed: ${await res.text()}`);

    const data = (await res.json()) as {
      data?: { access_token: string; refresh_token: string; expires_in: number };
      error?: string;
    };

    if (!data.data) throw new Error(`TikTok refresh error: ${data.error}`);

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: Date.now() + data.data.expires_in * 1000,
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const res = await fetch(
      `${this.apiBase}/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) throw new Error(`TikTok fetchAccountInfo failed: ${await res.text()}`);

    const data = (await res.json()) as {
      data?: {
        user?: {
          open_id: string;
          display_name: string;
          username?: string;
          avatar_url?: string;
          follower_count?: number;
        };
      };
      error?: { code: string; message: string };
    };

    const user = data.data?.user;
    if (!user) throw new Error(`TikTok account info error: ${data.error?.message}`);

    return {
      platformAccountId: user.open_id,
      username: user.username ?? user.display_name,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      followerCount: user.follower_count,
    };
  }

  async publish(accessToken: string, payload: PublishPayload): Promise<PublishResult> {
    const { caption, mediaUrls, options } = payload;

    try {
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('TikTok requires a video URL to publish');
      }

      const videoUrl = mediaUrls[0]!;

      // Step 1: Initialize upload
      const initRes = await fetch(`${this.apiBase}/post/publish/video/init/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: caption.substring(0, 2200),
            privacy_level: (options?.['privacyLevel'] as string) ?? 'SELF_ONLY',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.text();
        return { success: false, errorCode: 'INIT_FAILED', errorMessage: err };
      }

      const initData = (await initRes.json()) as {
        data?: { publish_id: string };
        error?: { code: string; message: string };
      };

      if (!initData.data?.publish_id) {
        return {
          success: false,
          errorCode: initData.error?.code ?? 'UNKNOWN',
          errorMessage: initData.error?.message ?? 'No publish_id returned',
        };
      }

      return {
        success: true,
        platformPostId: initData.data.publish_id,
        rawResponse: initData,
      };
    } catch (err: unknown) {
      this.logger.error('TikTok publish error', err);
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, errorCode: 'EXCEPTION', errorMessage: message };
    }
  }
}
