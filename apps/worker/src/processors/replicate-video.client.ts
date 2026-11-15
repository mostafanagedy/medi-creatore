import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnrecoverableError } from 'bullmq';
import type { VideoGenerationQueueInput } from '@ai-content-os/types/worker-jobs';

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
  logs?: string | null;
}

export type VideoClientStatus =
  | { status: 'pending' | 'processing'; progress?: number }
  | { status: 'completed'; videoUrl: string }
  | { status: 'failed'; errorMessage: string };

@Injectable()
export class ReplicateVideoClient {
  private readonly logger = new Logger(ReplicateVideoClient.name);
  private readonly apiToken: string | undefined;
  private readonly baseUrl = 'https://api.replicate.com/v1';
  private readonly defaultModel = 'alibaba/wan-3';

  constructor(config: ConfigService) {
    const rawToken = config.get<string>('REPLICATE_API_TOKEN') ?? process.env.REPLICATE_API_TOKEN;
    this.apiToken = rawToken?.trim() ? rawToken.trim() : undefined;
    if (this.apiToken) {
      this.logger.log('ReplicateVideoClient initialized with token');
    }
  }

  get isAvailable(): boolean {
    return Boolean(this.apiToken);
  }

  async createTask(input: VideoGenerationQueueInput): Promise<string> {
    if (!this.apiToken) {
      throw new UnrecoverableError('REPLICATE_API_TOKEN is not configured for the worker.');
    }

    const duration = input.durationSec ?? 5;
    const aspectRatios: Record<string, string> = {
      '16:9': '16:9',
      '9:16': '9:16',
      '1:1': '1:1',
    };
    const aspectRatio = input.aspectRatio ? (aspectRatios[input.aspectRatio] ?? '16:9') : '16:9';

    const promptText = [input.prompt || input.scriptText || '', input.style]
      .filter((part): part is string => Boolean(part?.trim()))
      .join('\nStyle: ');

    const payloadInput: Record<string, unknown> = {
      prompt: promptText,
      duration,
      aspect_ratio: aspectRatio,
      resolution: '720p',
    };

    if (input.imageUrl) {
      payloadInput.image = input.imageUrl;
    }

    const response = await fetch(`${this.baseUrl}/models/${this.defaultModel}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        Prefer: 'respond-async',
      },
      body: JSON.stringify({ input: payloadInput }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorJson = (await response.json()) as { title?: string; detail?: string; error?: string };
        detail = errorJson.detail || errorJson.error || errorJson.title || '';
      } catch {
        detail = await response.text().catch(() => '');
      }

      const message = detail
        ? `Replicate (${response.status}): ${detail}`
        : `Replicate request failed with status ${response.status}.`;

      if (response.status < 500 && response.status !== 429) {
        throw new UnrecoverableError(message);
      }
      throw new Error(message);
    }

    const prediction = (await response.json()) as ReplicatePrediction;
    if (!prediction.id) {
      throw new Error('Replicate did not return a prediction ID.');
    }

    this.logger.log(`Created Replicate prediction: ${prediction.id} (model: ${this.defaultModel})`);
    return prediction.id;
  }

  async getTaskStatus(taskId: string): Promise<VideoClientStatus> {
    if (!this.apiToken) {
      throw new UnrecoverableError('REPLICATE_API_TOKEN is not configured for the worker.');
    }

    const response = await fetch(`${this.baseUrl}/predictions/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const message = `Replicate status check failed with status ${response.status}.`;
      if (response.status < 500 && response.status !== 429) {
        throw new UnrecoverableError(message);
      }
      throw new Error(message);
    }

    const prediction = (await response.json()) as ReplicatePrediction;

    switch (prediction.status) {
      case 'succeeded': {
        const rawOutput = prediction.output;
        const videoUrl = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;
        if (!videoUrl || typeof videoUrl !== 'string') {
          return { status: 'failed', errorMessage: 'Replicate finished without a video URL output.' };
        }
        return { status: 'completed', videoUrl };
      }
      case 'failed':
      case 'canceled':
        return {
          status: 'failed',
          errorMessage: prediction.error || `Replicate prediction ${prediction.status}.`,
        };
      case 'processing':
        return { status: 'processing', progress: 50 };
      case 'starting':
      default:
        return { status: 'pending', progress: 10 };
    }
  }
}
