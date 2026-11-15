import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnrecoverableError } from 'bullmq';
import type { VideoGenerationQueueInput } from '@ai-content-os/types/worker-jobs';

interface RunwayTaskCreated {
  id: string;
}

interface RunwayTaskStatus {
  status?: string;
  output?: string[];
  error?: string;
  progress?: number;
}

export type RunwayVideoStatus =
  | { status: 'pending' | 'processing'; progress?: number }
  | { status: 'completed'; videoUrl: string }
  | { status: 'failed'; errorMessage: string };

@Injectable()
export class RunwayVideoClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    const rawKey = config.get<string>('RUNWAYML_API_KEY') ?? process.env.RUNWAYML_API_KEY;
    this.apiKey = rawKey?.trim() ? rawKey.trim() : undefined;
    const rawUrl = config.get<string>('RUNWAYML_BASE_URL') ?? process.env.RUNWAYML_BASE_URL;
    this.baseUrl = rawUrl?.trim() ? rawUrl.trim() : 'https://api.dev.runwayml.com/v1';
  }

  async createTask(input: VideoGenerationQueueInput): Promise<string> {
    const duration = input.durationSec ?? 5;
    if (duration !== 5 && duration !== 10) {
      throw new UnrecoverableError('Runway video duration must be 5 or 10 seconds.');
    }

    const ratios: Record<string, string> = {
      '16:9': '1280:720',
      '9:16': '720:1280',
    };
    const requestedRatio = input.aspectRatio ?? '16:9';
    const ratio = ratios[requestedRatio];
    if (!ratio) {
      throw new UnrecoverableError(`Runway does not support the requested aspect ratio: ${requestedRatio}.`);
    }

    const promptText = [input.prompt || input.scriptText || '', input.style]
      .filter((part): part is string => Boolean(part?.trim()))
      .join('\nStyle and camera direction: ');

    const isImageToVideo = Boolean(input.imageUrl);
    const endpoint = isImageToVideo ? '/image_to_video' : '/text_to_video';

    const payload: Record<string, string | number> = {
      model: isImageToVideo ? 'gen4_turbo' : 'gen4.5',
      duration,
      ratio,
    };

    if (promptText) {
      payload.promptText = promptText;
    }

    if (input.imageUrl) {
      payload.promptImage = input.imageUrl;
    }

    const result = await this.request<RunwayTaskCreated>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!result.id) throw new Error('Runway returned a task without an ID.');
    return result.id;
  }

  async getTaskStatus(taskId: string): Promise<RunwayVideoStatus> {
    const result = await this.request<RunwayTaskStatus>(`/tasks/${encodeURIComponent(taskId)}`);
    switch (result.status) {
      case 'SUCCEEDED': {
        const videoUrl = result.output?.[0];
        if (!videoUrl) return { status: 'failed', errorMessage: 'Runway completed the task without a video URL.' };
        return { status: 'completed', videoUrl };
      }
      case 'FAILED':
      case 'CANCELED':
        return { status: 'failed', errorMessage: result.error || `Runway task ${result.status.toLowerCase()}.` };
      case 'RUNNING':
        return { status: 'processing', progress: result.progress };
      default:
        return { status: 'pending', progress: result.progress };
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new UnrecoverableError('RUNWAYML_API_KEY is not configured for the worker.');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorJson = (await response.json()) as { error?: string; message?: string };
        detail = errorJson.error || errorJson.message || '';
      } catch {
        // Ignore json parse error
      }
      const message = detail
        ? `Runway: ${detail}`
        : `Runway request failed with status ${response.status}.`;
      if (response.status < 500 && response.status !== 429) {
        throw new UnrecoverableError(message);
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }
}
