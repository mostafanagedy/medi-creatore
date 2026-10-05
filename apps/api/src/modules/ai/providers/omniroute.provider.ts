import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OmnirouteProvider implements TextProvider {
  private readonly logger = new Logger(OmnirouteProvider.name);
  private readonly client: OpenAI | null = null;
  readonly providerName = 'omniroute';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OMNIROUTE_API_KEY');
    const baseURL = this.configService.get<string>('OMNIROUTE_BASE_URL');
    
    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL });
      this.logger.log('Omniroute provider initialized');
    } else {
      this.logger.warn('OMNIROUTE_API_KEY not configured — Omniroute provider disabled');
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  // ── Text Generation ──

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.client) throw new Error('Omniroute not configured');

    const start = Date.now();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini', // Update if omniroute requires a specific model
      messages,
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP,
      stop: request.stop,
    });

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      text: choice?.message.content ?? '',
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
      model: response.model,
      provider: this.providerName,
      finishReason: choice?.finish_reason ?? undefined,
      durationMs: Date.now() - start,
    };
  }
}
