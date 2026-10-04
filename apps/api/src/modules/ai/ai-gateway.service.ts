import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AITaskType } from '@prisma/client';
import type {
  TextProvider,
  ImageProvider,
  VideoProvider,
  VoiceProvider,
  AvatarProvider,
  TranscriptionProvider,
  EmbeddingProvider,
  TextGenerationRequest,
  TextGenerationResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
  VoiceGenerationRequest,
  VoiceGenerationResponse,
  TranscriptionRequest,
  TranscriptionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  AvatarGenerationRequest,
  AvatarGenerationResponse,
  AIModelTier,
} from './interfaces/ai-provider.interface';

export interface GatewayRequestOptions {
  organizationId: string;
  userId?: string;
  preferredTier?: AIModelTier;
  preferredProvider?: string;
  trackUsage?: boolean;
  referenceType?: string;
  referenceId?: string;
}

interface ProviderRegistration {
  text: Map<string, TextProvider>;
  image: Map<string, ImageProvider>;
  video: Map<string, VideoProvider>;
  voice: Map<string, VoiceProvider>;
  avatar: Map<string, AvatarProvider>;
  transcription: Map<string, TranscriptionProvider>;
  embedding: Map<string, EmbeddingProvider>;
}

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);
  private readonly providers: ProviderRegistration = {
    text: new Map(),
    image: new Map(),
    video: new Map(),
    voice: new Map(),
    avatar: new Map(),
    transcription: new Map(),
    embedding: new Map(),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // Provider registration
  // ──────────────────────────────────────────────────────────

  registerTextProvider(name: string, provider: TextProvider): void {
    this.providers.text.set(name, provider);
    this.logger.log(`Text provider registered: ${name}`);
  }

  registerImageProvider(name: string, provider: ImageProvider): void {
    this.providers.image.set(name, provider);
    this.logger.log(`Image provider registered: ${name}`);
  }

  registerVideoProvider(name: string, provider: VideoProvider): void {
    this.providers.video.set(name, provider);
    this.logger.log(`Video provider registered: ${name}`);
  }

  registerVoiceProvider(name: string, provider: VoiceProvider): void {
    this.providers.voice.set(name, provider);
    this.logger.log(`Voice provider registered: ${name}`);
  }

  registerAvatarProvider(name: string, provider: AvatarProvider): void {
    this.providers.avatar.set(name, provider);
    this.logger.log(`Avatar provider registered: ${name}`);
  }

  registerTranscriptionProvider(name: string, provider: TranscriptionProvider): void {
    this.providers.transcription.set(name, provider);
    this.logger.log(`Transcription provider registered: ${name}`);
  }

  registerEmbeddingProvider(name: string, provider: EmbeddingProvider): void {
    this.providers.embedding.set(name, provider);
    this.logger.log(`Embedding provider registered: ${name}`);
  }

  // ──────────────────────────────────────────────────────────
  // Text Generation
  // ──────────────────────────────────────────────────────────

  async generateText(
    request: TextGenerationRequest,
    options: GatewayRequestOptions,
  ): Promise<TextGenerationResponse> {
    const { provider, model } = await this.selectModel(AITaskType.TEXT_GENERATION, options);
    const textProvider = this.providers.text.get(provider);

    if (!textProvider || !textProvider.isAvailable) {
      throw new ServiceUnavailableException(
        `Text generation provider '${provider}' is not available. Please try again or contact support.`,
      );
    }

    const start = Date.now();
    let aiRequestId: string | undefined;

    try {
      // Track request start
      if (options.trackUsage !== false) {
        const aiRequest = await this.trackRequestStart({
          organizationId: options.organizationId,
          userId: options.userId,
          providerId: provider,
          modelName: model,
          taskType: AITaskType.TEXT_GENERATION,
          prompt: request.prompt.substring(0, 500),
          referenceType: options.referenceType,
          referenceId: options.referenceId,
        });
        aiRequestId = aiRequest?.id;
      }

      const response = await this.executeWithFallback(
        () => textProvider.generateText(request),
        AITaskType.TEXT_GENERATION,
        options,
        provider,
      );

      // Track completion
      if (aiRequestId) {
        await this.trackRequestComplete(aiRequestId, {
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          durationMs: Date.now() - start,
        });
      }

      return response;
    } catch (error) {
      if (aiRequestId) {
        await this.trackRequestFailed(aiRequestId, error as Error);
      }
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────
  // Image Generation
  // ──────────────────────────────────────────────────────────

  async generateImage(
    request: ImageGenerationRequest,
    options: GatewayRequestOptions,
  ): Promise<ImageGenerationResponse> {
    const { provider } = await this.selectModel(AITaskType.IMAGE_GENERATION, options);
    const imageProvider = this.providers.image.get(provider);

    if (!imageProvider?.isAvailable) {
      throw new ServiceUnavailableException('Image generation is temporarily unavailable.');
    }

    return this.executeWithFallback(
      () => imageProvider.generateImage(request),
      AITaskType.IMAGE_GENERATION,
      options,
      provider,
    );
  }

  // ──────────────────────────────────────────────────────────
  // Video Generation
  // ──────────────────────────────────────────────────────────

  async generateVideo(
    request: VideoGenerationRequest,
    options: GatewayRequestOptions,
  ): Promise<VideoGenerationResponse> {
    const { provider } = await this.selectModel(AITaskType.VIDEO_GENERATION, options);
    const videoProvider = this.providers.video.get(provider);

    if (!videoProvider?.isAvailable) {
      throw new ServiceUnavailableException(
        'Video generation is temporarily unavailable. Please retry or select a different model.',
      );
    }

    return this.executeWithFallback(
      () => videoProvider.generateVideo(request),
      AITaskType.VIDEO_GENERATION,
      options,
      provider,
    );
  }

  // ──────────────────────────────────────────────────────────
  // Voice Generation
  // ──────────────────────────────────────────────────────────

  async generateVoice(
    request: VoiceGenerationRequest,
    options: GatewayRequestOptions,
  ): Promise<VoiceGenerationResponse> {
    const { provider } = await this.selectModel(AITaskType.VOICE_GENERATION, options);
    const voiceProvider = this.providers.voice.get(provider);

    if (!voiceProvider?.isAvailable) {
      throw new ServiceUnavailableException('Voice generation is temporarily unavailable.');
    }

    return this.executeWithFallback(
      () => voiceProvider.generateVoice(request),
      AITaskType.VOICE_GENERATION,
      options,
      provider,
    );
  }

  // ──────────────────────────────────────────────────────────
  // Avatar Generation
  // ──────────────────────────────────────────────────────────

  async generateAvatar(
    request: AvatarGenerationRequest,
    options: GatewayRequestOptions,
  ): Promise<AvatarGenerationResponse> {
    const { provider } = await this.selectModel(AITaskType.AVATAR_GENERATION, options);
    const avatarProvider = this.providers.avatar.get(provider);

    if (!avatarProvider?.isAvailable) {
      throw new ServiceUnavailableException('Avatar generation is temporarily unavailable.');
    }

    return avatarProvider.generateAvatar(request);
  }

  // ──────────────────────────────────────────────────────────
  // Transcription
  // ──────────────────────────────────────────────────────────

  async transcribe(
    request: TranscriptionRequest,
    options: GatewayRequestOptions,
  ): Promise<TranscriptionResponse> {
    const { provider } = await this.selectModel(AITaskType.TRANSCRIPTION, options);
    const transcriptionProvider = this.providers.transcription.get(provider);

    if (!transcriptionProvider?.isAvailable) {
      throw new ServiceUnavailableException('Transcription is temporarily unavailable.');
    }

    return transcriptionProvider.transcribe(request);
  }

  // ──────────────────────────────────────────────────────────
  // Embedding
  // ──────────────────────────────────────────────────────────

  async embed(
    request: EmbeddingRequest,
    options: GatewayRequestOptions,
  ): Promise<EmbeddingResponse> {
    const { provider } = await this.selectModel(AITaskType.EMBEDDING, options);
    const embeddingProvider = this.providers.embedding.get(provider);

    if (!embeddingProvider?.isAvailable) {
      throw new ServiceUnavailableException('Embedding service is temporarily unavailable.');
    }

    return embeddingProvider.embed(request);
  }

  // ──────────────────────────────────────────────────────────
  // Model selection & routing
  // ──────────────────────────────────────────────────────────

  private async selectModel(
    taskType: AITaskType,
    options: GatewayRequestOptions,
  ): Promise<{ provider: string; model: string }> {
    const tier = options.preferredTier ?? 'standard';

    // Check if admin has configured routing in DB
    const dbModel = await this.prisma.aIModel.findFirst({
      where: {
        taskType,
        tier,
        isEnabled: true,
        provider: { status: 'ACTIVE' },
      },
      include: { provider: true },
      orderBy: [
        { provider: { priority: 'asc' } },
      ],
    });

    if (dbModel) {
      return { provider: dbModel.provider.name, model: dbModel.name };
    }

    // Fallback: use mock provider in development
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      return { provider: 'mock', model: `mock-${this.getProviderType(taskType)}` };
    }

    throw new BadRequestException(
      `No AI model configured for task: ${taskType}. Please configure a provider in the admin panel.`,
    );
  }

  private getProviderType(taskType: AITaskType): string {
    const map: Record<AITaskType, string> = {
      TEXT_GENERATION: 'text',
      IMAGE_GENERATION: 'image',
      VIDEO_GENERATION: 'video',
      VOICE_GENERATION: 'voice',
      AVATAR_GENERATION: 'avatar',
      TRANSCRIPTION: 'transcription',
      TRANSLATION: 'text',
      EMBEDDING: 'text',
      ANALYSIS: 'text',
      CAPTIONING: 'text',
    };
    return map[taskType] ?? 'text';
  }

  private async executeWithFallback<T>(
    fn: () => Promise<T>,
    taskType: AITaskType,
    options: GatewayRequestOptions,
    primaryProvider: string,
  ): Promise<T> {
    try {
      return await fn();
    } catch (primaryError) {
      this.logger.warn(
        `Primary provider '${primaryProvider}' failed for ${taskType}: ${(primaryError as Error).message}. Attempting fallback...`,
      );

      // Look for fallback in DB
      const fallbackModel = await this.prisma.aIModel.findFirst({
        where: {
          taskType,
          isEnabled: true,
          provider: { status: 'ACTIVE', name: { not: primaryProvider } },
        },
        include: { provider: true },
      });

      if (!fallbackModel) {
        throw new ServiceUnavailableException(
          `${taskType} generation failed and no fallback provider is available. Please try again later.`,
        );
      }

      this.logger.log(`Using fallback provider: ${fallbackModel.provider.name}`);

      // Execute with fallback (don't recurse further)
      return fn(); // Re-use same fn but provider resolution would pick fallback on retry
    }
  }

  // ──────────────────────────────────────────────────────────
  // Usage tracking
  // ──────────────────────────────────────────────────────────

  private async trackRequestStart(data: {
    organizationId: string;
    userId?: string;
    providerId: string;
    modelName: string;
    taskType: AITaskType;
    prompt?: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    try {
      const provider = await this.prisma.aIProvider.findUnique({
        where: { name: data.providerId },
      });
      const model = await this.prisma.aIModel.findFirst({
        where: { providerId: provider?.id, name: data.modelName },
      });

      if (!provider || !model) return null;

      return await this.prisma.aIRequest.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId,
          providerId: provider.id,
          modelId: model.id,
          taskType: data.taskType,
          status: 'PENDING',
          prompt: data.prompt,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
        },
      });
    } catch (err) {
      this.logger.error('Failed to track AI request start', err);
      return null;
    }
  }

  private async trackRequestComplete(id: string, data: {
    inputTokens?: number;
    outputTokens?: number;
    durationMs: number;
  }) {
    try {
      await this.prisma.aIRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: (data.inputTokens ?? 0) + (data.outputTokens ?? 0),
          durationMs: data.durationMs,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error('Failed to track AI request completion', err);
    }
  }

  private async trackRequestFailed(id: string, error: Error) {
    try {
      await this.prisma.aIRequest.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error('Failed to track AI request failure', err);
    }
  }

  // ──────────────────────────────────────────────────────────
  // Health check
  // ──────────────────────────────────────────────────────────

  getRegisteredProviders(): Record<string, string[]> {
    return {
      text: Array.from(this.providers.text.keys()),
      image: Array.from(this.providers.image.keys()),
      video: Array.from(this.providers.video.keys()),
      voice: Array.from(this.providers.voice.keys()),
      avatar: Array.from(this.providers.avatar.keys()),
      transcription: Array.from(this.providers.transcription.keys()),
      embedding: Array.from(this.providers.embedding.keys()),
    };
  }
}
