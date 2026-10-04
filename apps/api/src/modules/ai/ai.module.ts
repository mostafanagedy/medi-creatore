import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIGatewayService } from './ai-gateway.service';
import { AIController } from './ai.controller';
import { OllamaProvider } from './providers/ollama.provider';
import { CodecraftProvider } from './providers/codecraft.provider';
import { RunwayMLProvider } from './providers/runwayml.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { MockAIProvider } from './providers/mock.provider';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AIController],
  providers: [
    AIGatewayService,
    OllamaProvider,
    CodecraftProvider,
    RunwayMLProvider,
    OpenAIProvider,
    AnthropicProvider,
    MockAIProvider,
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
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const env = this.config.get<string>('NODE_ENV', 'development');

    // Register Ollama (if configured)
    if (this.ollama.isAvailable) {
      this.gateway.registerTextProvider('ollama', this.ollama);
    }

    // Register Codecraft (if configured)
    if (this.codecraft.isAvailable) {
      this.gateway.registerTextProvider('codecraft', this.codecraft);
    }

    // Register RunwayML (if configured)
    if (this.runwayml.isAvailable) {
      this.gateway.registerVideoProvider('runwayml', this.runwayml);
      this.gateway.registerImageProvider('runwayml', this.runwayml);
    }

    // Register OpenAI (if configured)
    if (this.openai.isAvailable) {
      this.gateway.registerTextProvider('openai', this.openai);
      this.gateway.registerImageProvider('openai', this.openai);
      this.gateway.registerVoiceProvider('openai', this.openai);
      this.gateway.registerTranscriptionProvider('openai', this.openai);
      this.gateway.registerEmbeddingProvider('openai', this.openai);
    }

    // Register Anthropic (if configured)
    if (this.anthropic.isAvailable) {
      this.gateway.registerTextProvider('anthropic', this.anthropic);
    }

    // Register Mock (dev/test only)
    if (env !== 'production' && this.mock.isAvailable) {
      this.gateway.registerTextProvider('mock', this.mock);
      this.gateway.registerImageProvider('mock', this.mock);
      this.gateway.registerVideoProvider('mock', this.mock);
      this.gateway.registerVoiceProvider('mock', this.mock);
      this.gateway.registerAvatarProvider('mock', this.mock);
      this.gateway.registerTranscriptionProvider('mock', this.mock);
      this.gateway.registerEmbeddingProvider('mock', this.mock);
    }
  }
}
