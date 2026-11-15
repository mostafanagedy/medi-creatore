import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from '@prisma/client';
import {
  IPlatformOAuthAdapter,
  PlatformTokens,
  PlatformAccountInfo,
  PublishPayload,
  PublishResult,
} from '../api-stub/platform-oauth.interface';

@Injectable()
export class YouTubeOAuthAdapter implements IPlatformOAuthAdapter {
  readonly platform = SocialPlatform.YOUTUBE;

  private readonly logger = new Logger(YouTubeOAuthAdapter.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly youtubeApiBase = 'https://www.googleapis.com/youtube/v3';
  private readonly uploadUrl =
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('GOOGLE_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
  }

  async refreshAccessToken(refreshToken: string): Promise<PlatformTokens> {
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`YouTube refresh failed: ${await res.text()}`);

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      scope?: string;
      token_type: string;
    };

    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
      tokenType: data.token_type,
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
        snippet: {
          title: string;
          customUrl?: string;
          thumbnails?: { default?: { url?: string } };
        };
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

      const metadata = {
        snippet: {
          title: caption.substring(0, 100),
          description: caption,
          tags: (options?.['tags'] as string[]) ?? [],
          categoryId: (options?.['categoryId'] as string) ?? '22',
        },
        status: {
          privacyStatus: (options?.['privacyStatus'] as string) ?? 'private',
          selfDeclaredMadeForKids: false,
        },
      };

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
