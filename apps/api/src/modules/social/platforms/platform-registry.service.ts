import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { MetaOAuthAdapter } from './meta.adapter';
import { TikTokOAuthAdapter } from './tiktok.adapter';
import { YouTubeOAuthAdapter } from './youtube.adapter';
import { IPlatformOAuthAdapter } from './platform-oauth.interface';

/**
 * Central registry for all social platform OAuth adapters.
 *
 * Usage:
 *   const adapter = platformRegistry.getAdapter(SocialPlatform.INSTAGRAM);
 *   const url = adapter.buildAuthUrl(state, redirectUri);
 */
@Injectable()
export class PlatformRegistryService {
  private readonly logger = new Logger(PlatformRegistryService.name);
  private readonly adapters = new Map<SocialPlatform, IPlatformOAuthAdapter>();

  constructor(
    private readonly meta: MetaOAuthAdapter,
    private readonly tiktok: TikTokOAuthAdapter,
    private readonly youtube: YouTubeOAuthAdapter,
  ) {
    // Meta adapts both Instagram and Facebook under the same credentials
    this.adapters.set(SocialPlatform.INSTAGRAM, meta);
    this.adapters.set(SocialPlatform.FACEBOOK, meta);
    this.adapters.set(SocialPlatform.TIKTOK, tiktok);
    this.adapters.set(SocialPlatform.YOUTUBE, youtube);

    this.logger.log(
      `Platform registry initialized with ${this.adapters.size} adapters: ${[...this.adapters.keys()].join(', ')}`,
    );
  }

  /**
   * Retrieve an adapter for a given platform.
   * @throws NotFoundException if the platform is not yet supported.
   */
  getAdapter(platform: SocialPlatform): IPlatformOAuthAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new NotFoundException(
        `Platform "${platform}" is not supported yet. Supported: ${[...this.adapters.keys()].join(', ')}`,
      );
    }
    return adapter;
  }

  /**
   * Returns true if there is a registered adapter for the given platform.
   */
  isSupported(platform: SocialPlatform): boolean {
    return this.adapters.has(platform);
  }

  /**
   * Returns the list of supported platforms.
   */
  getSupportedPlatforms(): SocialPlatform[] {
    return [...this.adapters.keys()];
  }
}
