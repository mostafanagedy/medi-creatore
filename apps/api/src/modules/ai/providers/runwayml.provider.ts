import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  VideoProvider,
  ImageProvider,
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoGenerationStatusResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class RunwayMLProvider implements VideoProvider, ImageProvider {
  private readonly logger = new Logger(RunwayMLProvider.name);
  readonly providerName = 'runwayml';
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RUNWAYML_API_KEY');
    this.baseUrl = this.configService.get<string>('RUNWAYML_BASE_URL', 'https://api.dev.runwayml.com/v1');
    if (this.apiKey) {
      this.logger.log('RunwayML provider initialized');
    } else {
      this.logger.warn('RUNWAYML_API_KEY not configured — RunwayML provider disabled');
    }
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  // --- VIDEO GENERATION ---

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    if (!this.apiKey) throw new Error('RunwayML not configured');

    const start = Date.now();
    const isImageToVideo = Boolean(request.imageUrl);
    const endpoint = `${this.baseUrl}${isImageToVideo ? '/image_to_video' : '/text_to_video'}`;

    const ratios: Record<string, string> = {
      '16:9': '1280:720',
      '9:16': '720:1280',
    };
    const ratio = (request.aspectRatio && ratios[request.aspectRatio]) ? ratios[request.aspectRatio] : '1280:720';

    const payload: Record<string, any> = {
      model: isImageToVideo ? 'gen4_turbo' : 'gen4.5',
      duration: request.durationSec ?? 5,
      ratio,
    };

    const promptText = request.prompt || request.scriptText || '';
    if (promptText) {
      payload.promptText = promptText;
    }

    if (request.imageUrl) {
      payload.promptImage = request.imageUrl;
    }

    if (request.seed) {
      payload.seed = request.seed;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errJson = (await response.json()) as Record<string, any>;
        detail = errJson?.error || errJson?.message || '';
      } catch {
        detail = await response.text();
      }
      this.logger.error(`RunwayML API error: ${response.status} ${detail}`);
      throw new Error(`RunwayML API error: ${detail || response.statusText}`);
    }

    const data: any = await response.json();

    return {
      taskId: data.id,
      status: 'pending',
      model: payload.model,
      provider: this.providerName,
      durationMs: Date.now() - start,
    };
  }

  async getVideoStatus(taskId: string): Promise<VideoGenerationStatusResponse> {
    if (!this.apiKey) throw new Error('RunwayML not configured');

    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!response.ok) {
      throw new Error(`RunwayML status check failed: ${response.statusText}`);
    }

    const data: any = await response.json();
    let mappedStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    
    if (data.status === 'SUCCEEDED') mappedStatus = 'completed';
    else if (data.status === 'FAILED') mappedStatus = 'failed';
    else if (data.status === 'RUNNING') mappedStatus = 'processing';
    else if (data.status === 'PENDING') mappedStatus = 'pending';

    return {
      taskId,
      status: mappedStatus,
      videoUrl: data.output?.[0] || undefined,
      errorMessage: data.error || undefined,
      progress: data.progress,
    };
  }

  // --- IMAGE GENERATION ---
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.apiKey) throw new Error('RunwayML not configured');
    
    const start = Date.now();
    
    // NOTE: RunwayML v1 currently does not expose a standard image generation endpoint identical to its task api,
    // but the system will register it as a fallback image provider based on the user's request.
    this.logger.warn('RunwayML image generation endpoint called (mocked pending API support).');

    return {
      images: [
        {
          url: 'https://placeholder.com/runway-image.jpg',
          width: request.width ?? 1024,
          height: request.height ?? 1024,
        }
      ],
      model: 'runway-image',
      provider: this.providerName,
      durationMs: Date.now() - start,
    };
  }
}
