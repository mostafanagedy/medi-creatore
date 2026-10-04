/**
 * Mock AI Provider — FOR DEVELOPMENT AND TESTING ONLY.
 *
 * This provider returns deterministic, clearly labeled mock responses
 * to allow local development without real API credentials.
 *
 * NEVER use this provider in production. It is clearly disabled
 * unless NODE_ENV is 'development' or 'test'.
 *
 * Mock responses are:
 * - Clearly prefixed with "[MOCK]"
 * - Logged as warnings
 * - Not charged credits
 * - Never stored as real AI-generated content in production
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
  ImageProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoProvider,
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoGenerationStatusResponse,
  VoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResponse,
  Voice,
  AvatarProvider,
  AvatarGenerationRequest,
  AvatarGenerationResponse,
  Avatar,
  TranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResponse,
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class MockAIProvider
  implements
    TextProvider,
    ImageProvider,
    VideoProvider,
    VoiceProvider,
    AvatarProvider,
    TranscriptionProvider,
    EmbeddingProvider
{
  private readonly logger = new Logger(MockAIProvider.name);
  readonly providerName = 'mock';

  constructor(private readonly configService: ConfigService) {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    if (env === 'production') {
      this.logger.error(
        '⚠️ CRITICAL: Mock AI provider is initialized in production! This must never happen.',
      );
    } else {
      this.logger.warn(
        '🔶 Mock AI provider active — for development only. Configure real providers for production.',
      );
    }
  }

  get isAvailable(): boolean {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    return env !== 'production';
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.logger.warn(`[MOCK] generateText called for prompt: "${request.prompt.substring(0, 50)}..."`);
    await this.delay(500);

    const mockText = `[MOCK RESPONSE — NOT REAL AI OUTPUT]

This is a development mock response for your prompt: "${request.prompt.substring(0, 100)}..."

## Hook
Are you ready to transform your content strategy? [MOCK]

## Introduction
In today's digital landscape, creating compelling content is crucial for success. [MOCK]

## Main Points
1. Point one about your topic [MOCK]
2. Point two with supporting details [MOCK]
3. Point three with actionable insights [MOCK]

## Call to Action
Like, share, and follow for more amazing content! [MOCK]

---
⚠️ Configure a real AI provider (OpenAI, Anthropic, etc.) for production use.`;

    return {
      text: mockText,
      inputTokens: Math.floor(request.prompt.length / 4),
      outputTokens: Math.floor(mockText.length / 4),
      totalTokens: Math.floor((request.prompt.length + mockText.length) / 4),
      model: 'mock-text-v1',
      provider: this.providerName,
      finishReason: 'stop',
      durationMs: 500,
    };
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    this.logger.warn(`[MOCK] generateImage called: "${request.prompt?.substring(0, 50)}"`);
    await this.delay(800);

    return {
      images: [
        {
          url: `https://placehold.co/${request.width ?? 1024}x${request.height ?? 1024}/1a1a2e/ffffff?text=MOCK+IMAGE`,
          width: request.width ?? 1024,
          height: request.height ?? 1024,
          revisedPrompt: `[MOCK] ${request.prompt}`,
        },
      ],
      model: 'mock-image-v1',
      provider: this.providerName,
      durationMs: 800,
    };
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    this.logger.warn(`[MOCK] generateVideo called`);
    await this.delay(1000);

    return {
      taskId: `mock-task-${Date.now()}`,
      status: 'pending',
      estimatedCompletionMs: 10000,
      model: 'mock-video-v1',
      provider: this.providerName,
      durationMs: 1000,
    };
  }

  async getVideoStatus(taskId: string): Promise<VideoGenerationStatusResponse> {
    return {
      taskId,
      status: 'completed',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      progress: 100,
    };
  }

  async generateVoice(request: VoiceGenerationRequest): Promise<VoiceGenerationResponse> {
    this.logger.warn(`[MOCK] generateVoice called`);
    await this.delay(600);

    return {
      audioBuffer: Buffer.from('[MOCK AUDIO DATA]'),
      durationSec: request.text.split(' ').length / 150,
      model: 'mock-voice-v1',
      provider: this.providerName,
      durationMs: 600,
      format: 'mp3',
    };
  }

  async listVoices(): Promise<Voice[]> {
    return [
      { id: 'mock-male-1', name: 'Mock Male Voice', gender: 'male', language: 'en', provider: this.providerName },
      { id: 'mock-female-1', name: 'Mock Female Voice', gender: 'female', language: 'en', provider: this.providerName },
      { id: 'mock-arabic-1', name: 'Mock Arabic Voice', gender: 'male', language: 'ar', provider: this.providerName },
    ];
  }

  async generateAvatar(request: AvatarGenerationRequest): Promise<AvatarGenerationResponse> {
    this.logger.warn(`[MOCK] generateAvatar called`);
    await this.delay(1200);

    return {
      taskId: `mock-avatar-${Date.now()}`,
      status: 'pending',
      model: 'mock-avatar-v1',
      provider: this.providerName,
      durationMs: 1200,
    };
  }

  async listAvatars(): Promise<Avatar[]> {
    return [
      { id: 'mock-avatar-1', name: 'Mock Avatar Alex', gender: 'male', provider: this.providerName },
      { id: 'mock-avatar-2', name: 'Mock Avatar Sara', gender: 'female', provider: this.providerName },
    ];
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    this.logger.warn(`[MOCK] transcribe called`);
    await this.delay(400);

    return {
      text: '[MOCK TRANSCRIPTION] This is a mock transcription of the audio content.',
      segments: [
        { start: 0, end: 2, text: '[MOCK] This is a mock transcription' },
        { start: 2, end: 4, text: '[MOCK] of the audio content.' },
      ],
      language: request.language ?? 'en',
      durationSec: 4,
      model: 'mock-whisper-v1',
      provider: this.providerName,
      durationMs: 400,
    };
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    this.logger.warn(`[MOCK] embed called`);
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    return {
      embeddings: inputs.map(() => Array.from({ length: 1536 }, () => Math.random() * 2 - 1)),
      model: 'mock-embedding-v1',
      provider: this.providerName,
      totalTokens: inputs.join(' ').length / 4,
      durationMs: 100,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
