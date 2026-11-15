import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
  TextProviderCallOptions,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class AlibabaProvider implements TextProvider {
  private readonly logger = new Logger(AlibabaProvider.name);
  private readonly client: OpenAI | null = null;
  readonly providerName = 'alibaba';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ALIBABA_API_KEY');
    const baseURL = this.configService.get<string>(
      'ALIBABA_BASE_URL',
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    );

    if (apiKey && !apiKey.includes('your-') && !apiKey.includes('change-me')) {
      this.client = new OpenAI({ apiKey, baseURL });
      this.logger.log('Alibaba DashScope (Qwen) provider initialized');
    } else {
      this.logger.warn('ALIBABA_API_KEY not configured — Alibaba provider disabled');
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  async generateText(
    request: TextGenerationRequest,
    options: TextProviderCallOptions = {},
  ): Promise<TextGenerationResponse> {
    if (!this.client) throw new Error('Alibaba provider not configured');

    const start = Date.now();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const configuredModel = this.configService.get<string>(
      'ALIBABA_DEFAULT_MODEL',
      'qwen3.5-plus',
    );
    const model = options.model && options.model !== 'default' ? options.model : configuredModel;

    const response = await this.client.chat.completions.create({
      model,
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
