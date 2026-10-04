import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class CodecraftProvider implements TextProvider {
  private readonly logger = new Logger(CodecraftProvider.name);
  readonly providerName = 'codecraft';
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CODECRAFT_API_KEY');
    if (this.apiKey) {
      this.logger.log('Codecraft provider initialized');
    } else {
      this.logger.warn('CODECRAFT_API_KEY not configured — Codecraft provider disabled');
    }
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.apiKey) throw new Error('Codecraft not configured');

    const start = Date.now();

    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await fetch('https://codecraftapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        temperature: request.temperature ?? 1,
        max_tokens: request.maxTokens ?? 8192,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Codecraft API error: ${response.status} ${errorText}`);
      throw new Error(`Codecraft API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    return {
      text,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      model: 'claude-opus-5',
      provider: this.providerName,
      finishReason: data.choices?.[0]?.finish_reason || 'stop',
      durationMs: Date.now() - start,
    };
  }
}
