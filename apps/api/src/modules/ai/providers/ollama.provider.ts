import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OllamaProvider implements TextProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  readonly providerName = 'ollama';
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OLLAMA_API_KEY');
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    
    // We consider Ollama available if we at least have a base URL. The API key is optional for local Ollama.
    if (this.baseUrl) {
      this.logger.log(`Ollama provider initialized (URL: ${this.baseUrl})`);
    } else {
      this.logger.warn('Ollama provider disabled (No Base URL)');
    }
  }

  get isAvailable(): boolean {
    return !!this.baseUrl;
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    const start = Date.now();

    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    // Most hosted Ollama or native Ollama now support the OpenAI-compatible /v1/chat/completions endpoint
    const endpoint = this.baseUrl.endsWith('/v1') 
      ? `${this.baseUrl}/chat/completions`
      : this.baseUrl.endsWith('/v1/') 
        ? `${this.baseUrl}chat/completions`
        : `${this.baseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        // Fallback to a default model like llama3
        model: 'llama3',
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Ollama API error: ${response.status} ${errorText}`);
      throw new Error(`Ollama API error: ${response.statusText}`);
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
      model: data.model || 'ollama-model',
      provider: this.providerName,
      finishReason: data.choices?.[0]?.finish_reason || 'stop',
      durationMs: Date.now() - start,
    };
  }
}
