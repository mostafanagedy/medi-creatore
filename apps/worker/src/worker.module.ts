import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { QUEUE_NAMES } from './queues/queue-names';
import { VideoGenerationProcessor } from './processors/video-generation.processor';
import { RunwayVideoClient } from './processors/runway-video.client';
import { ReplicateVideoClient } from './processors/replicate-video.client';
import { VideoRenderingProcessor } from './processors/video-rendering.processor';
import {
  AudioGenerationProcessor,
  CaptionGenerationProcessor,
  ImageGenerationProcessor,
  ThumbnailGenerationProcessor,
  TranscriptionProcessor,
} from './processors/media-generation.processor';
import { SocialPublishingProcessor } from './processors/social-publishing.processor';
import { AnalyticsSyncProcessor } from './processors/analytics-sync.processor';
import { ContentRepurposingProcessor } from './processors/content-repurposing.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { PrismaModule } from './prisma/prisma.module';

const queueRegistrations = Object.values(QUEUE_NAMES).map((name) => ({
  name,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1_000 },
    removeOnComplete: { age: 86_400, count: 1_000 },
    removeOnFail: false,
  },
}));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
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
    BullModule.registerQueue(...queueRegistrations),
    PrismaModule,
  ],
  providers: [
    VideoGenerationProcessor,
    RunwayVideoClient,
    ReplicateVideoClient,
    VideoRenderingProcessor,
    AudioGenerationProcessor,
    ImageGenerationProcessor,
    TranscriptionProcessor,
    CaptionGenerationProcessor,
    ThumbnailGenerationProcessor,
    SocialPublishingProcessor,
    AnalyticsSyncProcessor,
    ContentRepurposingProcessor,
    NotificationsProcessor,
  ],
})
export class WorkerModule {}
