import { Injectable, Logger } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { MetaOAuthAdapter } from './meta.adapter';
import { TikTokOAuthAdapter } from './tiktok.adapter';
import { YouTubeOAuthAdapter } from './youtube.adapter';
import { IPlatformOAuthAdapter } from '../api-stub/platform-oauth.interface';

@Injectable()
export class PlatformRegistryService {
  private readonly logger = new Logger(PlatformRegistryService.name);
  private readonly adapters = new Map<SocialPlatform, IPlatformOAuthAdapter>();

  constructor(
    private readonly meta: MetaOAuthAdapter,
    private readonly tiktok: TikTokOAuthAdapter,
    private readonly youtube: YouTubeOAuthAdapter,
  ) {
    this.adapters.set(SocialPlatform.INSTAGRAM, meta);
    this.adapters.set(SocialPlatform.FACEBOOK, meta);
    this.adapters.set(SocialPlatform.TIKTOK, tiktok);
    this.adapters.set(SocialPlatform.YOUTUBE, youtube);

    this.logger.log(
      `Worker platform registry initialized with adapters: ${[...this.adapters.keys()].join(', ')}`,
    );
  }

  getAdapter(platform: SocialPlatform): IPlatformOAuthAdapter | null {
    return this.adapters.get(platform) ?? null;
  }

  isSupported(platform: SocialPlatform): boolean {
    return this.adapters.has(platform);
  }
}
