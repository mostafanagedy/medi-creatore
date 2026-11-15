import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AITaskType } from "@prisma/client";
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
  TextProviderCallOptions,
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
} from "./interfaces/ai-provider.interface";
import { AIProviderSettingsService } from "./ai-provider-settings.service";
import { ANTHROPIC_PROVIDER_NAME } from "./ai-provider-settings.service";

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
    private readonly providerSettings: AIProviderSettingsService,
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

  registerTranscriptionProvider(
    name: string,
    provider: TranscriptionProvider,
  ): void {
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
    const credential = options.userId
      ? await this.providerSettings.getAnthropicRuntimeCredential(
          options.userId,
        )
      : null;
    const { provider, model } = credential
      ? { provider: ANTHROPIC_PROVIDER_NAME, model: credential.model }
      : await this.selectModel(AITaskType.TEXT_GENERATION, options);

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

      const executeText = async (pName: string, mName: string) => {
        const p = this.providers.text.get(pName);
        if (!p || (!p.isAvailable && !credential)) {
          throw new ServiceUnavailableException(
            `Text generation provider '${pName}' is not available. Please try again or contact support.`,
          );
        }
        const callOptions: TextProviderCallOptions = {
          model: mName,
          ...(credential ? { apiKey: credential.apiKey } : {}),
        };
        return p.generateText(request, callOptions);
      };

      const response = credential
        ? await executeText(provider, model)
        : await this.executeWithFallback(
            (p, m) => executeText(p, m),
            AITaskType.TEXT_GENERATION,
            options,
            provider,
            model,
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
    const { provider, model } = await this.selectModel(
      AITaskType.IMAGE_GENERATION,
      options,
    );

    const executeImage = (pName: string) => {
      const p = this.providers.image.get(pName);
      if (!p?.isAvailable) {
        throw new ServiceUnavailableException(
          `Image generation provider '${pName}' is not available.`,
        );
      }
      return p.generateImage(request);
    };

    return this.executeWithFallback(
      (p) => executeImage(p),
      AITaskType.IMAGE_GENERATION,
      options,
      provider,
      model,
    );
  }

  // ──────────────────────────────────────────────────────────
  // Video Generation
  // ──────────────────────────────────────────────────────────

  async generateVideo(
    request: VideoGenerationRequest,
    options: GatewayRequestOptions,
  ): Promise<VideoGenerationResponse> {
    const { provider, model } = await this.selectModel(
      AITaskType.VIDEO_GENERATION,
      options,
    );

    const executeVideo = (pName: string) => {
      const p = this.providers.video.get(pName);
      if (!p?.isAvailable) {
        throw new ServiceUnavailableException(
          `Video generation provider '${pName}' is not available. Please retry or select a different model.`,
        );
      }
      return p.generateVideo(request);
    };

    return this.executeWithFallback(
      (p) => executeVideo(p),
      AITaskType.VIDEO_GENERATION,
      options,
      provider,
      model,
    );
  }

  async getVideoStatus(taskId: string, options: GatewayRequestOptions) {
    const { provider } = await this.selectModel(
      AITaskType.VIDEO_GENERATION,
      options,
    );
    const videoProvider = this.providers.video.get(provider);

    if (!videoProvider?.isAvailable) {
      throw new ServiceUnavailableException(
        "Video status is temporarily unavailable.",
      );
    }

    return videoProvider.getVideoStatus(taskId);
  }

  // ──────────────────────────────────────────────────────────
  // Voice Generation
  // ──────────────────────────────────────────────────────────

  async generateVoice(
    request: VoiceGenerationRequest,
    options: GatewayRequestOptions,
  ): Promise<VoiceGenerationResponse> {
    const { provider, model } = await this.selectModel(
      AITaskType.VOICE_GENERATION,
      options,
    );

    const executeVoice = (pName: string) => {
      const p = this.providers.voice.get(pName);
      if (!p?.isAvailable) {
        throw new ServiceUnavailableException(
          `Voice generation provider '${pName}' is not available.`,
        );
      }
      return p.generateVoice(request);
    };

    return this.executeWithFallback(
      (p) => executeVoice(p),
      AITaskType.VOICE_GENERATION,
      options,
      provider,
      model,
    );
  }

  // ──────────────────────────────────────────────────────────
  // Avatar Generation
  // ──────────────────────────────────────────────────────────

  async generateAvatar(
    request: AvatarGenerationRequest,
    options: GatewayRequestOptions,
  ): Promise<AvatarGenerationResponse> {
    const { provider } = await this.selectModel(
      AITaskType.AVATAR_GENERATION,
      options,
    );
    const avatarProvider = this.providers.avatar.get(provider);

    if (!avatarProvider?.isAvailable) {
      throw new ServiceUnavailableException(
        "Avatar generation is temporarily unavailable.",
      );
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
    const { provider } = await this.selectModel(
      AITaskType.TRANSCRIPTION,
      options,
    );
    const transcriptionProvider = this.providers.transcription.get(provider);

    if (!transcriptionProvider?.isAvailable) {
      throw new ServiceUnavailableException(
        "Transcription is temporarily unavailable.",
      );
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
      throw new ServiceUnavailableException(
        "Embedding service is temporarily unavailable.",
      );
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
    const tier = options.preferredTier ?? "standard";
    const providerCategory = this.getProviderType(taskType) as keyof ProviderRegistration;
    const registeredProviders = this.providers[providerCategory];

    // Check if admin has configured routing in DB
    const dbModels = await this.prisma.aIModel.findMany({
      where: {
        taskType,
        tier,
        isEnabled: true,
        provider: { status: "ACTIVE" },
      },
      include: { provider: true },
      orderBy: [{ provider: { priority: "asc" } }],
    });

    const availableModel = dbModels.find((m) => {
      const p = registeredProviders?.get(m.provider.name);
      return p && p.isAvailable;
    });

    if (availableModel) {
      return { provider: availableModel.provider.name, model: availableModel.name };
    }

    // Check other registered providers (excluding mock)
    if (registeredProviders) {
      for (const [name, p] of registeredProviders.entries()) {
        if (p.isAvailable && name !== "mock") {
          return { provider: name, model: "default" };
        }
      }
    }

    // Fallback: use mock provider in development
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development");
    if (nodeEnv === "development" || nodeEnv === "test") {
      return {
        provider: "mock",
        model: `mock-${this.getProviderType(taskType)}`,
      };
    }

    throw new BadRequestException(
      `No AI model configured for task: ${taskType}. Please configure a provider in the admin panel.`,
    );
  }

  private getProviderType(taskType: AITaskType): string {
    const map: Record<AITaskType, string> = {
      TEXT_GENERATION: "text",
      IMAGE_GENERATION: "image",
      VIDEO_GENERATION: "video",
      VOICE_GENERATION: "voice",
      AVATAR_GENERATION: "avatar",
      TRANSCRIPTION: "transcription",
      TRANSLATION: "text",
      EMBEDDING: "text",
      ANALYSIS: "text",
      CAPTIONING: "text",
    };
    return map[taskType] ?? "text";
  }

  private async executeWithFallback<T>(
    executor: (provider: string, model: string) => Promise<T>,
    taskType: AITaskType,
    options: GatewayRequestOptions,
    primaryProvider: string,
    primaryModel: string,
  ): Promise<T> {
    try {
      return await executor(primaryProvider, primaryModel);
    } catch (primaryError) {
      this.logger.warn(
        `Primary provider '${primaryProvider}' failed for ${taskType}: ${(primaryError as Error).message}. Attempting fallback...`,
      );

      const providerCategory = this.getProviderType(taskType) as keyof ProviderRegistration;
      const registeredProviders = this.providers[providerCategory];

      // Look for fallback models in DB
      const fallbackModels = await this.prisma.aIModel.findMany({
        where: {
          taskType,
          isEnabled: true,
          provider: { status: "ACTIVE", name: { not: primaryProvider } },
        },
        include: { provider: true },
        orderBy: [{ provider: { priority: "asc" } }],
      });

      const nextModel = fallbackModels.find((m) => {
        const p = registeredProviders?.get(m.provider.name);
        return p && p.isAvailable;
      });

      if (nextModel) {
        this.logger.log(`Using fallback provider from DB: ${nextModel.provider.name} (${nextModel.name})`);
        return await executor(nextModel.provider.name, nextModel.name);
      }

      // Check other registered providers
      if (registeredProviders) {
        for (const [name, p] of registeredProviders.entries()) {
          if (name !== primaryProvider && p.isAvailable && name !== "mock") {
            this.logger.log(`Using fallback registered provider: ${name}`);
            return await executor(name, "default");
          }
        }
      }

      // Fallback to mock in dev/test
      const nodeEnv = this.configService.get<string>("NODE_ENV", "development");
      if ((nodeEnv === "development" || nodeEnv === "test") && primaryProvider !== "mock") {
        const mockP = registeredProviders?.get("mock");
        if (mockP?.isAvailable) {
          this.logger.log(`Using mock fallback provider`);
          return await executor("mock", `mock-${providerCategory}`);
        }
      }

      throw new ServiceUnavailableException(
        `${taskType} generation failed and no fallback provider is available. Please try again later.`,
      );
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
          status: "PENDING",
          prompt: data.prompt,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
        },
      });
    } catch (err) {
      this.logger.error("Failed to track AI request start", err);
      return null;
    }
  }

  private async trackRequestComplete(
    id: string,
    data: {
      inputTokens?: number;
      outputTokens?: number;
      durationMs: number;
    },
  ) {
    try {
      await this.prisma.aIRequest.update({
        where: { id },
        data: {
          status: "COMPLETED",
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: (data.inputTokens ?? 0) + (data.outputTokens ?? 0),
          durationMs: data.durationMs,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error("Failed to track AI request completion", err);
    }
  }

  private async trackRequestFailed(id: string, error: Error) {
    try {
      await this.prisma.aIRequest.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error("Failed to track AI request failure", err);
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

  listConfiguredModels() {
    return this.prisma.aIModel.findMany({
      include: {
        provider: { select: { name: true, displayName: true, status: true } },
      },
      orderBy: [{ taskType: "asc" }, { tier: "asc" }, { displayName: "asc" }],
    });
  }

  listRecentRequests() {
    return this.prisma.aIRequest.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        taskType: true,
        status: true,
        durationMs: true,
        creditsConsumed: true,
        estimatedCostUsd: true,
        actualCostUsd: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
        provider: { select: { displayName: true } },
        model: { select: { displayName: true } },
      },
    });
  }

  async getUsageSummary() {
    const [totals, byProvider, byTask] = await Promise.all([
      this.prisma.aIRequest.aggregate({
        _count: { _all: true },
        _sum: {
          actualCostUsd: true,
          estimatedCostUsd: true,
          creditsConsumed: true,
        },
      }),
      this.prisma.aIRequest.groupBy({
        by: ["providerId"],
        _count: { _all: true },
        _sum: { actualCostUsd: true, estimatedCostUsd: true },
      }),
      this.prisma.aIRequest.groupBy({
        by: ["taskType"],
        _count: { _all: true },
        _sum: {
          actualCostUsd: true,
          estimatedCostUsd: true,
          creditsConsumed: true,
        },
      }),
    ]);
    const providerIds = byProvider.map((row) => row.providerId);
    const providers = await this.prisma.aIProvider.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, displayName: true },
    });
    const providerNames = new Map(
      providers.map((provider) => [provider.id, provider.displayName]),
    );

    return {
      totals: {
        requests: totals._count._all,
        actualCostUsd: totals._sum.actualCostUsd ?? 0,
        estimatedCostUsd: totals._sum.estimatedCostUsd ?? 0,
        creditsConsumed: totals._sum.creditsConsumed ?? 0,
      },
      providers: byProvider.map((row) => ({
        name: providerNames.get(row.providerId) ?? row.providerId,
        requests: row._count._all,
        actualCostUsd: row._sum.actualCostUsd ?? 0,
        estimatedCostUsd: row._sum.estimatedCostUsd ?? 0,
      })),
      tasks: byTask.map((row) => ({
        taskType: row.taskType,
        requests: row._count._all,
        actualCostUsd: row._sum.actualCostUsd ?? 0,
        estimatedCostUsd: row._sum.estimatedCostUsd ?? 0,
        creditsConsumed: row._sum.creditsConsumed ?? 0,
      })),
    };
  }
}
