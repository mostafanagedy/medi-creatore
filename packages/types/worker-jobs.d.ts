export interface VideoGenerationQueueInput {
  prompt?: string;
  imageUrl?: string;
  scriptText?: string;
  durationSec?: number;
  aspectRatio?: string;
  style?: string;
}

export type VideoGenerationJobData =
  | {
      action: 'generate';
      videoId: string;
      userId: string;
      input: VideoGenerationQueueInput;
      startedAt: number;
      creditsCharged: number;
    }
  | {
      action: 'poll';
      videoId: string;
      userId: string;
      providerTaskId: string;
      startedAt: number;
      pollAttempt: number;
      creditsCharged: number;
    };
