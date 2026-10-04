import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
  ImageProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResponse,
  Voice,
  TranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResponse,
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAIProvider
  implements TextProvider, ImageProvider, VoiceProvider, TranscriptionProvider, EmbeddingProvider
{
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI | null = null;
  readonly providerName = 'openai';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('OpenAI provider initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not configured — OpenAI provider disabled');
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  // ── Text Generation ──

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.client) throw new Error('OpenAI not configured');

    const start = Date.now();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
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

  // ── Image Generation ──

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.client) throw new Error('OpenAI not configured');

    const start = Date.now();

    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt: request.prompt,
      n: request.numberOfImages ?? 1,
      size: this.mapSize(request.width, request.height, request.aspectRatio),
      quality: request.quality ?? 'standard',
      style: (request.style as 'vivid' | 'natural' | undefined) ?? 'vivid',
      response_format: 'url',
    });

    return {
      images: (response.data ?? []).map((img) => ({
        url: img.url ?? '',
        width: request.width ?? 1024,
        height: request.height ?? 1024,
        revisedPrompt: img.revised_prompt,
      })),
      model: 'dall-e-3',
      provider: this.providerName,
      durationMs: Date.now() - start,
    };
  }

  private mapSize(
    width?: number,
    height?: number,
    aspectRatio?: string,
  ): '1024x1024' | '1792x1024' | '1024x1792' {
    if (aspectRatio === '16:9' || (width && height && width > height)) return '1792x1024';
    if (aspectRatio === '9:16' || (width && height && height > width)) return '1024x1792';
    return '1024x1024';
  }

  // ── Voice Generation ──

  async generateVoice(request: VoiceGenerationRequest): Promise<VoiceGenerationResponse> {
    if (!this.client) throw new Error('OpenAI not configured');

    const start = Date.now();
    const voice = this.mapVoice(request.voiceId, request.gender);

    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      input: request.text,
      voice,
      speed: request.speed ?? 1.0,
      response_format: request.outputFormat === 'ogg' ? 'opus' : (request.outputFormat ?? 'mp3'),
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      audioBuffer: buffer,
      durationSec: request.text.split(' ').length / 150, // estimate
      model: 'tts-1',
      provider: this.providerName,
      durationMs: Date.now() - start,
      format: request.outputFormat ?? 'mp3',
    };
  }

  async listVoices(): Promise<Voice[]> {
    return [
      { id: 'alloy', name: 'Alloy', gender: 'neutral', language: 'en', provider: this.providerName },
      { id: 'echo', name: 'Echo', gender: 'male', language: 'en', provider: this.providerName },
      { id: 'fable', name: 'Fable', gender: 'neutral', language: 'en', provider: this.providerName },
      { id: 'onyx', name: 'Onyx', gender: 'male', language: 'en', provider: this.providerName },
      { id: 'nova', name: 'Nova', gender: 'female', language: 'en', provider: this.providerName },
      { id: 'shimmer', name: 'Shimmer', gender: 'female', language: 'en', provider: this.providerName },
    ];
  }

  private mapVoice(voiceId?: string, gender?: string): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
    const valid = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (voiceId && valid.includes(voiceId)) return voiceId as 'alloy';
    if (gender === 'female') return 'nova';
    if (gender === 'male') return 'onyx';
    return 'alloy';
  }

  // ── Transcription ──

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    if (!this.client) throw new Error('OpenAI not configured');

    const start = Date.now();

    if (!request.audioBuffer && !request.audioUrl) {
      throw new Error('Either audioBuffer or audioUrl must be provided');
    }

    const buffer = request.audioBuffer ?? Buffer.alloc(0);
    const file = new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });

    const response = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: request.language,
      prompt: request.prompt,
      response_format: request.format === 'json' ? 'verbose_json' : 'text',
      timestamp_granularities: request.timestampGranularity
        ? [request.timestampGranularity]
        : undefined,
    });

    const text = typeof response === 'string' ? response : (response as { text: string }).text ?? '';

    return {
      text,
      model: 'whisper-1',
      provider: this.providerName,
      durationMs: Date.now() - start,
    };
  }

  // ── Embedding ──

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client) throw new Error('OpenAI not configured');

    const start = Date.now();

    const response = await this.client.embeddings.create({
      model: request.model ?? 'text-embedding-3-small',
      input: request.input,
    });

    return {
      embeddings: response.data.map((d) => d.embedding),
      model: response.model,
      provider: this.providerName,
      totalTokens: response.usage.total_tokens,
      durationMs: Date.now() - start,
    };
  }
}
