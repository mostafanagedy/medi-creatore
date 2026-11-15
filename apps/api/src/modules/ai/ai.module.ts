import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AIGatewayService } from "./ai-gateway.service";
import { AIController } from "./ai.controller";
import { OllamaProvider } from "./providers/ollama.provider";
import { CodecraftProvider } from "./providers/codecraft.provider";
import { RunwayMLProvider } from "./providers/runwayml.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { MockAIProvider } from "./providers/mock.provider";
import { OmnirouteProvider } from "./providers/omniroute.provider";
import { AlibabaProvider } from "./providers/alibaba.provider";
import { UsersModule } from "../users/users.module";
import { CreditsModule } from "../credits/credits.module";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { VIDEO_GENERATION_QUEUE } from "./ai-queue.constants";
import { AIProviderSettingsController } from "./ai-provider-settings.controller";
import { AIProviderSettingsService } from "./ai-provider-settings.service";
import { ProviderApiKeyEncryptionService } from "./provider-api-key-encryption.service";

@Module({
  imports: [
    UsersModule,
    CreditsModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>("REDIS_URL");
        const connection = redisUrl
          ? new Redis(redisUrl, { maxRetriesPerRequest: null })
          : new Redis({
              host: config.get<string>("REDIS_HOST", "localhost"),
              port: config.get<number>("REDIS_PORT", 6379),
              password: config.get<string>("REDIS_PASSWORD"),
              db: config.get<number>("REDIS_DB", 0),
              maxRetriesPerRequest: null,
            });
        return { connection };
      },
    }),
    BullModule.registerQueue({
      name: VIDEO_GENERATION_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: false,
      },
    }),
  ],
  controllers: [AIController, AIProviderSettingsController],
  providers: [
    AIGatewayService,
    AIProviderSettingsService,
    ProviderApiKeyEncryptionService,
    OllamaProvider,
    CodecraftProvider,
    RunwayMLProvider,
    OpenAIProvider,
    AnthropicProvider,
    MockAIProvider,
    OmnirouteProvider,
    AlibabaProvider,
  ],
  exports: [AIGatewayService],
})
export class AIModule implements OnModuleInit {
  constructor(
    private readonly gateway: AIGatewayService,
    private readonly ollama: OllamaProvider,
    private readonly codecraft: CodecraftProvider,
    private readonly runwayml: RunwayMLProvider,
    private readonly openai: OpenAIProvider,
    private readonly anthropic: AnthropicProvider,
    private readonly mock: MockAIProvider,
    private readonly omniroute: OmnirouteProvider,
    private readonly alibaba: AlibabaProvider,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const env = this.config.get<string>("NODE_ENV", "development");

    // Register Ollama (if configured)
    if (this.ollama.isAvailable) {
      this.gateway.registerTextProvider("ollama", this.ollama);
    }

    // Register Codecraft (if configured)
    if (this.codecraft.isAvailable) {
      this.gateway.registerTextProvider("codecraft", this.codecraft);
    }

    // Register RunwayML (if configured)
    if (this.runwayml.isAvailable) {
      this.gateway.registerVideoProvider("runwayml", this.runwayml);
      this.gateway.registerImageProvider("runwayml", this.runwayml);
    }

    // Register OpenAI (if configured)
    if (this.openai.isAvailable) {
      this.gateway.registerTextProvider("openai", this.openai);
      this.gateway.registerImageProvider("openai", this.openai);
      this.gateway.registerVoiceProvider("openai", this.openai);
      this.gateway.registerTranscriptionProvider("openai", this.openai);
      this.gateway.registerEmbeddingProvider("openai", this.openai);
    }

    // The provider can use a user-supplied key even when no platform key is set.
    this.gateway.registerTextProvider("anthropic", this.anthropic);

    // Register Omniroute (if configured)
    if (this.omniroute.isAvailable) {
      this.gateway.registerTextProvider("omniroute", this.omniroute);
    }

    // Register Alibaba (if configured)
    if (this.alibaba.isAvailable) {
      this.gateway.registerTextProvider("alibaba", this.alibaba);
    }

    // Register Mock (dev/test only)
    if (env !== "production" && this.mock.isAvailable) {
      this.gateway.registerTextProvider("mock", this.mock);
      this.gateway.registerImageProvider("mock", this.mock);
      this.gateway.registerVideoProvider("mock", this.mock);
      this.gateway.registerVoiceProvider("mock", this.mock);
      this.gateway.registerAvatarProvider("mock", this.mock);
      this.gateway.registerTranscriptionProvider("mock", this.mock);
      this.gateway.registerEmbeddingProvider("mock", this.mock);
    }
  }
}
