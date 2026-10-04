import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class AnthropicProvider implements TextProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null = null;
  readonly providerName = 'anthropic';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log('Anthropic provider initialized');
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not configured — Anthropic provider disabled');
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.client) throw new Error('Anthropic not configured');

    const start = Date.now();

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: request.prompt },
    ];

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: request.maxTokens ?? 2048,
      system: request.systemPrompt,
      messages,
      temperature: request.temperature ?? 0.7,
    });

    const content = response.content[0];
    const text = content?.type === 'text' ? content.text : '';

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      model: response.model,
      provider: this.providerName,
      finishReason: response.stop_reason ?? undefined,
      durationMs: Date.now() - start,
    };
  }
}
