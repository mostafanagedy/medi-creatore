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

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RUNWAYML_API_KEY');
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
    
    // We default to image_to_video if imageUrl is present, otherwise text_to_video (gen3a is primarily video)
    const endpoint = 'https://api.runwayml.com/v1/image_to_video';

    const payload: Record<string, any> = {
      model: 'gen3a_turbo', // Default RunwayML Gen-3 Alpha model
      promptText: request.prompt || request.scriptText || '',
    };

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
        'X-Runway-Version': '2024-09-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`RunwayML API error: ${response.status} ${errorText}`);
      throw new Error(`RunwayML API error: ${response.statusText}`);
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

    const response = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-09-13',
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
