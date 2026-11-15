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
 * Meta (Facebook / Instagram) OAuth 2.0 adapter.
 *
 * Supports:
 *  - Instagram Basic Display API for account info
 *  - Instagram Graph API for publishing (Business/Creator accounts)
 *  - Facebook Pages for FB post publishing
 *
 * Docs:
 *  - https://developers.facebook.com/docs/instagram-api
 *  - https://developers.facebook.com/docs/graph-api/overview
 */
@Injectable()
export class MetaOAuthAdapter implements IPlatformOAuthAdapter {
  readonly platform = SocialPlatform.INSTAGRAM; // also covers FACEBOOK

  private readonly logger = new Logger(MetaOAuthAdapter.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly graphUrl = 'https://graph.facebook.com/v19.0';
  private readonly authUrl = 'https://www.facebook.com/v19.0/dialog/oauth';
  private readonly tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';

  private readonly scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'business_management',
  ].join(',');

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('META_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('META_CLIENT_SECRET') ?? '';
  }

  buildAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes,
      response_type: 'code',
      state,
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const res = await fetch(`${this.tokenUrl}?${params.toString()}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meta token exchange failed: ${err}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<PlatformTokens> {
    // Meta long-lived tokens don't use refresh tokens; extend via /oauth/access_token
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      fb_exchange_token: _refreshToken,
    });
    const res = await fetch(`${this.tokenUrl}?${params.toString()}`);
    if (!res.ok) throw new Error(`Meta token refresh failed: ${await res.text()}`);
    const data = (await res.json()) as { access_token: string; expires_in?: number };
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    // Step 1: get user's IG Business account linked to their pages
    const meRes = await fetch(
      `${this.graphUrl}/me?fields=id,name,picture&access_token=${accessToken}`,
    );
    if (!meRes.ok) throw new Error(`Meta fetchAccountInfo failed: ${await meRes.text()}`);
    const me = (await meRes.json()) as {
      id: string;
      name: string;
      picture?: { data?: { url?: string } };
    };

    // Step 2: try to get IG account attached to a page
    const pagesRes = await fetch(
      `${this.graphUrl}/me/accounts?fields=instagram_business_account{id,username,name,followers_count,profile_picture_url}&access_token=${accessToken}`,
    );
    let igAccount: PlatformAccountInfo | null = null;
    if (pagesRes.ok) {
      const pages = (await pagesRes.json()) as {
        data?: Array<{
          instagram_business_account?: {
            id: string;
            username: string;
            name: string;
            followers_count?: number;
            profile_picture_url?: string;
          };
        }>;
      };
      const ig = pages.data?.[0]?.instagram_business_account;
      if (ig) {
        igAccount = {
          platformAccountId: ig.id,
          username: ig.username,
          displayName: ig.name,
          avatarUrl: ig.profile_picture_url,
          followerCount: ig.followers_count,
          metadata: { facebookUserId: me.id },
        };
      }
    }

    return (
      igAccount ?? {
        platformAccountId: me.id,
        username: me.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: me.name,
        avatarUrl: me.picture?.data?.url,
      }
    );
  }

  async publish(accessToken: string, payload: PublishPayload): Promise<PublishResult> {
    // Instagram Graph API publishing: first create a media container, then publish it
    const { caption, mediaUrls } = payload;

    try {
      // Get IG account id (stored in metadata, but we'll re-fetch for safety)
      const accountInfo = await this.fetchAccountInfo(accessToken);
      const igUserId = accountInfo.platformAccountId;

      let containerId: string;

      if (mediaUrls && mediaUrls.length > 0) {
        // Image or video post
        const isVideo = mediaUrls[0]?.match(/\.(mp4|mov|avi|webm)$/i);
        const createParams: Record<string, string> = {
          caption,
          access_token: accessToken,
        };

        if (isVideo) {
          createParams['video_url'] = mediaUrls[0]!;
          createParams['media_type'] = 'REELS';
        } else if (mediaUrls.length > 1) {
          // Carousel
          const childIds: string[] = [];
          for (const imageUrl of mediaUrls) {
            const childRes = await fetch(`${this.graphUrl}/${igUserId}/media`, {
              method: 'POST',
              body: new URLSearchParams({ image_url: imageUrl, is_carousel_item: 'true', access_token: accessToken }),
            });
            const child = (await childRes.json()) as { id?: string; error?: { message: string } };
            if (!child.id) throw new Error(`Carousel child creation failed: ${child.error?.message}`);
            childIds.push(child.id);
          }
          createParams['media_type'] = 'CAROUSEL';
          createParams['children'] = childIds.join(',');
        } else {
          createParams['image_url'] = mediaUrls[0]!;
        }

        const containerRes = await fetch(`${this.graphUrl}/${igUserId}/media`, {
          method: 'POST',
          body: new URLSearchParams(createParams),
        });
        const container = (await containerRes.json()) as { id?: string; error?: { message: string } };
        if (!container.id) throw new Error(`IG media container creation failed: ${container.error?.message}`);
        containerId = container.id;
      } else {
        // Text-only — create a simple image placeholder (IG requires media)
        throw new Error('Instagram requires at least one media item to publish');
      }

      // Publish the container
      const publishRes = await fetch(`${this.graphUrl}/${igUserId}/media_publish`, {
        method: 'POST',
        body: new URLSearchParams({ creation_id: containerId, access_token: accessToken }),
      });
      const publishData = (await publishRes.json()) as { id?: string; error?: { message: string } };

      if (!publishData.id) {
        return {
          success: false,
          errorCode: 'PUBLISH_FAILED',
          errorMessage: publishData.error?.message ?? 'Unknown error',
        };
      }

      return {
        success: true,
        platformPostId: publishData.id,
        platformUrl: `https://www.instagram.com/p/${publishData.id}/`,
        rawResponse: publishData,
      };
    } catch (err: unknown) {
      this.logger.error('Meta publish error', err);
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, errorCode: 'EXCEPTION', errorMessage: message };
    }
  }
}
