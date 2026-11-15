import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MetaOAuthAdapter } from './platforms/meta.adapter';
import { TikTokOAuthAdapter } from './platforms/tiktok.adapter';
import { YouTubeOAuthAdapter } from './platforms/youtube.adapter';
import { PlatformRegistryService } from './platforms/platform-registry.service';
import { QUEUE_NAMES } from '../../queues/queue-names';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    OrganizationsModule,
    ConfigModule,
    // BullMQ — register the social publishing queue as producer
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const connection = redisUrl
          ? new Redis(redisUrl, { maxRetriesPerRequest: null })
          : new Redis({
              host: config.get<string>('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
              password: config.get<string>('REDIS_PASSWORD'),
              db: config.get<number>('REDIS_DB', 0),
              maxRetriesPerRequest: null,
            });
        return { connection };
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.SOCIAL_PUBLISHING,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1_000 },
      },
    }),
  ],
  controllers: [SocialController],
  providers: [
    // Platform OAuth adapters
    MetaOAuthAdapter,
    TikTokOAuthAdapter,
    YouTubeOAuthAdapter,
    PlatformRegistryService,
    // Core service
    SocialService,
  ],
  exports: [SocialService, PlatformRegistryService],
})
export class SocialModule {}
