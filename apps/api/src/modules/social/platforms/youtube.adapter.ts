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
 * YouTube / Google OAuth 2.0 adapter
 *
 * Uses Google OAuth 2.0 + YouTube Data API v3 for:
 *  - Authentication & channel info
 *  - Video uploads via resumable upload
 *
 * Docs:
 *  - https://developers.google.com/youtube/v3/guides/uploading_a_video
 *  - https://developers.google.com/identity/protocols/oauth2
 */
@Injectable()
export class YouTubeOAuthAdapter implements IPlatformOAuthAdapter {
  readonly platform = SocialPlatform.YOUTUBE;

  private readonly logger = new Logger(YouTubeOAuthAdapter.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly youtubeApiBase = 'https://www.googleapis.com/youtube/v3';
  private readonly uploadUrl =
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

  private readonly scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  constructor(private readonly config: ConfigService) {
    this.clientId =
      this.config.get<string>('YOUTUBE_CLIENT_ID') ??
      this.config.get<string>('GOOGLE_CLIENT_ID') ??
      '';
    this.clientSecret =
      this.config.get<string>('YOUTUBE_CLIENT_SECRET') ??
      this.config.get<string>('GOOGLE_CLIENT_SECRET') ??
      '';
  }

  buildAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes,
      access_type: 'offline', // get refresh_token
      prompt: 'consent', // force consent to get refresh_token every time
      state,
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) throw new Error(`YouTube token exchange failed: ${await res.text()}`);

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
      tokenType: data.token_type,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<PlatformTokens> {
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) throw new Error(`YouTube token refresh failed: ${await res.text()}`);

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshToken, // Google doesn't re-issue refresh tokens on every refresh
      scope: data.scope,
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const res = await fetch(
      `${this.youtubeApiBase}/channels?part=snippet,statistics&mine=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) throw new Error(`YouTube fetchAccountInfo failed: ${await res.text()}`);

    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } } };
        statistics?: { subscriberCount?: string };
      }>;
    };

    const channel = data.items?.[0];
    if (!channel) throw new Error('No YouTube channel found for this account');

    return {
      platformAccountId: channel.id,
      username: channel.snippet.customUrl ?? channel.id,
      displayName: channel.snippet.title,
      avatarUrl: channel.snippet.thumbnails?.default?.url,
      followerCount: channel.statistics?.subscriberCount
        ? parseInt(channel.statistics.subscriberCount, 10)
        : undefined,
    };
  }

  async publish(accessToken: string, payload: PublishPayload): Promise<PublishResult> {
    const { caption, mediaUrls, options } = payload;

    try {
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('YouTube requires a video URL to publish');
      }

      const videoUrl = mediaUrls[0]!;

      // For YouTube, we use resumable upload via URL.
      // In production, the worker should download the video from S3 and stream-upload it.
      // Here we initiate the resumable upload session and store the upload URL.

      const metadata = {
        snippet: {
          title: caption.substring(0, 100),
          description: caption,
          tags: (options?.['tags'] as string[]) ?? [],
          categoryId: (options?.['categoryId'] as string) ?? '22', // People & Blogs
        },
        status: {
          privacyStatus: (options?.['privacyStatus'] as string) ?? 'private',
          selfDeclaredMadeForKids: false,
        },
      };

      // Step 1: Initiate resumable upload session
      const initRes = await fetch(this.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/*',
        },
        body: JSON.stringify(metadata),
      });

      if (!initRes.ok) {
        const err = await initRes.text();
        return { success: false, errorCode: 'INIT_FAILED', errorMessage: err };
      }

      const uploadSessionUrl = initRes.headers.get('location');
      if (!uploadSessionUrl) {
        return { success: false, errorCode: 'NO_UPLOAD_URL', errorMessage: 'No Location header' };
      }

      // Step 2: Fetch video from source URL and upload
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) {
        return { success: false, errorCode: 'VIDEO_FETCH_FAILED', errorMessage: `Cannot fetch video: ${videoUrl}` };
      }

      const videoBuffer = await videoRes.arrayBuffer();
      const uploadRes = await fetch(uploadSessionUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/*',
          'Content-Length': videoBuffer.byteLength.toString(),
        },
        body: videoBuffer,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        return { success: false, errorCode: 'UPLOAD_FAILED', errorMessage: err };
      }

      const videoData = (await uploadRes.json()) as { id?: string; error?: { message: string } };

      if (!videoData.id) {
        return {
          success: false,
          errorCode: 'PUBLISH_FAILED',
          errorMessage: videoData.error?.message ?? 'Unknown error',
        };
      }

      return {
        success: true,
        platformPostId: videoData.id,
        platformUrl: `https://www.youtube.com/watch?v=${videoData.id}`,
        rawResponse: videoData,
      };
    } catch (err: unknown) {
      this.logger.error('YouTube publish error', err);
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, errorCode: 'EXCEPTION', errorMessage: message };
    }
  }
}
