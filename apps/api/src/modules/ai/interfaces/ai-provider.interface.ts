// AI Provider Interfaces — Core abstractions for the AI Gateway
// These interfaces define the contract for all AI provider implementations.
// Never import specific provider SDKs outside of provider implementation files.

export interface TextGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
  userId?: string;
  organizationId?: string;
}

export interface TextGenerationResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  finishReason?: string;
  durationMs: number;
}

// ──────────────────────────────────────────────────────────

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  quality?: 'standard' | 'hd';
  style?: string;
  numberOfImages?: number;
  referenceImageUrl?: string;
}

export interface ImageGenerationResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
    revisedPrompt?: string;
  }>;
  model: string;
  provider: string;
  durationMs: number;
}

// ──────────────────────────────────────────────────────────

export interface VideoGenerationRequest {
  prompt?: string;
  imageUrl?: string;
  scriptText?: string;
  durationSec?: number;
  aspectRatio?: string;
  style?: string;
  seed?: number;
  referenceVideoUrl?: string;
}

export interface VideoGenerationResponse {
  videoUrl?: string;
  taskId?: string;          // For async generation
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCompletionMs?: number;
  model: string;
  provider: string;
  durationMs: number;
}

export interface VideoGenerationStatusResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  progress?: number;
  errorMessage?: string;
}

// ──────────────────────────────────────────────────────────

export interface VoiceGenerationRequest {
  text: string;
  voiceId?: string;
  language?: string;
  gender?: 'male' | 'female' | 'neutral';
  style?: string;
  emotion?: string;
  speed?: number;          // 0.5 - 2.0
  pitch?: number;          // -20 to 20 semitones
  outputFormat?: 'mp3' | 'wav' | 'ogg';
}

export interface VoiceGenerationResponse {
  audioUrl?: string;
  audioBuffer?: Buffer;
  durationSec: number;
  model: string;
  provider: string;
  durationMs: number;
  format: string;
}

export interface Voice {
  id: string;
  name: string;
  gender?: string;
  language?: string;
  preview_url?: string;
  provider: string;
}

// ──────────────────────────────────────────────────────────

export interface AvatarGenerationRequest {
  scriptText: string;
  avatarId?: string;
  voiceId?: string;
  language?: string;
  backgroundUrl?: string;
  backgroundStyle?: string;
  aspectRatio?: string;
}

export interface AvatarGenerationResponse {
  videoUrl?: string;
  taskId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model: string;
  provider: string;
  durationMs: number;
}

export interface Avatar {
  id: string;
  name: string;
  previewUrl?: string;
  gender?: string;
  provider: string;
}

// ──────────────────────────────────────────────────────────

export interface TranscriptionRequest {
  audioUrl?: string;
  audioBuffer?: Buffer;
  language?: string;
  prompt?: string;
  format?: 'text' | 'json' | 'srt' | 'vtt';
  timestampGranularity?: 'word' | 'segment';
}

export interface TranscriptionResponse {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    words?: Array<{ start: number; end: number; word: string }>;
  }>;
  language?: string;
  durationSec?: number;
  model: string;
  provider: string;
  durationMs: number;
}

// ──────────────────────────────────────────────────────────

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: string;
  totalTokens: number;
  durationMs: number;
}

// ──────────────────────────────────────────────────────────

// Provider capability interfaces — implement only what the provider supports

export interface TextProvider {
  generateText(request: TextGenerationRequest): Promise<TextGenerationResponse>;
  readonly providerName: string;
  readonly isAvailable: boolean;
}

export interface ImageProvider {
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  readonly providerName: string;
  readonly isAvailable: boolean;
}

export interface VideoProvider {
  generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;
  getVideoStatus(taskId: string): Promise<VideoGenerationStatusResponse>;
  readonly providerName: string;
  readonly isAvailable: boolean;
}

export interface VoiceProvider {
  generateVoice(request: VoiceGenerationRequest): Promise<VoiceGenerationResponse>;
  listVoices(): Promise<Voice[]>;
  readonly providerName: string;
  readonly isAvailable: boolean;
}

export interface AvatarProvider {
  generateAvatar(request: AvatarGenerationRequest): Promise<AvatarGenerationResponse>;
  listAvatars(): Promise<Avatar[]>;
  readonly providerName: string;
  readonly isAvailable: boolean;
}

export interface TranscriptionProvider {
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse>;
  readonly providerName: string;
  readonly isAvailable: boolean;
}

export interface EmbeddingProvider {
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  readonly providerName: string;
  readonly isAvailable: boolean;
}

// ──────────────────────────────────────────────────────────

// AI Provider registry types
export type AIProviderCapability =
  | 'text'
  | 'image'
  | 'video'
  | 'voice'
  | 'avatar'
  | 'transcription'
  | 'embedding';

export interface AIProviderConfig {
  name: string;
  displayName: string;
  apiKey?: string;
  baseUrl?: string;
  config?: Record<string, unknown>;
  isEnabled: boolean;
  capabilities: AIProviderCapability[];
  priority: number;
}

// Task-to-tier routing config
export type AIModelTier = 'cheap' | 'standard' | 'premium';

export interface AIRoutingConfig {
  task: string;
  tier: AIModelTier;
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
}
