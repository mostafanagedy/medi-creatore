/**
 * AI Content OS — Shared Queue Definitions
 *
 * Central contract between the API and Background Workers.
 * All queue names and payload schemas live here to ensure type safety
 * and prevent runtime mismatches between producers and consumers.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// QUEUE NAMES
// ─────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  // AI Generation
  AI_TEXT: 'ai:text',
  AI_IMAGE: 'ai:image',
  AI_VOICE: 'ai:voice',
  AI_AVATAR: 'ai:avatar',
  AI_TRANSCRIPTION: 'ai:transcription',
  AI_CAPTION: 'ai:caption',

  // Video
  VIDEO_GENERATION: 'video:generation',
  VIDEO_RENDERING: 'video:rendering',
  VIDEO_THUMBNAIL: 'video:thumbnail',

  // Social
  SOCIAL_PUBLISH: 'social:publish',
  SOCIAL_ANALYTICS_SYNC: 'social:analytics-sync',

  // Notifications & misc
  NOTIFICATION_SEND: 'notification:send',
  EMAIL_SEND: 'email:send',

  // Content Moderation
  CONTENT_MODERATION: 'content:moderation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─────────────────────────────────────────────────────────────
// SHARED FIELD SCHEMAS
// ─────────────────────────────────────────────────────────────

const baseJobSchema = z.object({
  /** ID of the user who triggered the job */
  userId: z.string().uuid(),
  /** Organization this job belongs to */
  organizationId: z.string().uuid(),
  /** Idempotency key — prevents duplicate processing */
  idempotencyKey: z.string().min(1).optional(),
  /** Credits already charged for this job (used for refund on failure) */
  creditsCharged: z.number().int().min(0).default(0),
});

// ─────────────────────────────────────────────────────────────
// AI TEXT GENERATION
// ─────────────────────────────────────────────────────────────

export const aiTextJobSchema = baseJobSchema.extend({
  type: z.literal('ai:text'),
  prompt: z.string().min(1).max(50_000),
  systemPrompt: z.string().max(10_000).optional(),
  maxTokens: z.number().int().min(1).max(32_768).optional(),
  temperature: z.number().min(0).max(2).optional(),
  /** The record this generation is for — e.g. "script", "caption" */
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  /** Provider overrides */
  preferredProvider: z.string().optional(),
  preferredModel: z.string().optional(),
});

export type AITextJobPayload = z.infer<typeof aiTextJobSchema>;

// ─────────────────────────────────────────────────────────────
// AI IMAGE GENERATION
// ─────────────────────────────────────────────────────────────

export const aiImageJobSchema = baseJobSchema.extend({
  type: z.literal('ai:image'),
  imageId: z.string().uuid(),
  prompt: z.string().min(1).max(8_000),
  negativePrompt: z.string().max(4_000).optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  numberOfImages: z.number().int().min(1).max(4).default(1),
  aspectRatio: z.string().optional(),
  style: z.string().max(200).optional(),
  quality: z.enum(['standard', 'hd']).default('standard'),
});

export type AIImageJobPayload = z.infer<typeof aiImageJobSchema>;

// ─────────────────────────────────────────────────────────────
// AI VOICE GENERATION
// ─────────────────────────────────────────────────────────────

export const aiVoiceJobSchema = baseJobSchema.extend({
  type: z.literal('ai:voice'),
  audioId: z.string().uuid(),
  text: z.string().min(1).max(10_000),
  voiceId: z.string().optional(),
  language: z.string().default('en'),
  gender: z.enum(['male', 'female', 'neutral']).optional(),
  style: z.string().optional(),
  emotion: z.string().optional(),
  speed: z.number().min(0.25).max(4).default(1),
  outputFormat: z.enum(['mp3', 'wav', 'ogg', 'flac']).default('mp3'),
});

export type AIVoiceJobPayload = z.infer<typeof aiVoiceJobSchema>;

// ─────────────────────────────────────────────────────────────
// VIDEO GENERATION (AI provider — e.g. RunwayML, Kling)
// ─────────────────────────────────────────────────────────────

export const videoGenerationJobSchema = baseJobSchema.extend({
  type: z.literal('video:generation'),
  action: z.enum(['generate', 'poll']),
  videoId: z.string().uuid(),
  input: z.object({
    prompt: z.string().max(4_000).optional(),
    imageUrl: z.string().url().optional(),
    scriptText: z.string().max(20_000).optional(),
    durationSec: z.number().int().min(1).max(300).optional(),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
    style: z.string().max(200).optional(),
  }),
  /** Provider task ID for polling — only present when action === "poll" */
  providerTaskId: z.string().optional(),
  startedAt: z.number().optional(),
});

export type VideoGenerationJobPayload = z.infer<typeof videoGenerationJobSchema>;

// ─────────────────────────────────────────────────────────────
// VIDEO RENDERING (FFmpeg / Remotion — compose scenes)
// ─────────────────────────────────────────────────────────────

export const videoRenderingJobSchema = baseJobSchema.extend({
  type: z.literal('video:rendering'),
  videoProjectId: z.string().uuid(),
  outputFormat: z.enum(['mp4', 'webm', 'mov']).default('mp4'),
  resolution: z.enum(['1080p', '720p', '480p', '4k']).default('1080p'),
  fps: z.number().int().min(12).max(60).default(30),
});

export type VideoRenderingJobPayload = z.infer<typeof videoRenderingJobSchema>;

// ─────────────────────────────────────────────────────────────
// SOCIAL PUBLISHING
// ─────────────────────────────────────────────────────────────

export const socialPublishJobSchema = baseJobSchema.extend({
  type: z.literal('social:publish'),
  socialPostId: z.string().uuid(),
  publishingJobId: z.string().uuid(),
  /** Attempt number — used for exponential backoff */
  attemptNumber: z.number().int().min(1).default(1),
  /** Earliest time to attempt — for scheduling and backoff */
  scheduledAt: z.string().datetime().optional(),
});

export type SocialPublishJobPayload = z.infer<typeof socialPublishJobSchema>;

// ─────────────────────────────────────────────────────────────
// ANALYTICS SYNC
// ─────────────────────────────────────────────────────────────

export const analyticsSyncJobSchema = baseJobSchema.extend({
  type: z.literal('social:analytics-sync'),
  socialAccountId: z.string().uuid(),
  platform: z.string(),
  /** Sync posts up to this date (defaults to today) */
  syncUntilDate: z.string().datetime().optional(),
});

export type AnalyticsSyncJobPayload = z.infer<typeof analyticsSyncJobSchema>;

// ─────────────────────────────────────────────────────────────
// NOTIFICATION
// ─────────────────────────────────────────────────────────────

export const notificationJobSchema = z.object({
  type: z.literal('notification:send'),
  notificationType: z.string(),
  targetUserId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  title: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
  channels: z.array(z.enum(['in-app', 'email', 'push'])).default(['in-app']),
});

export type NotificationJobPayload = z.infer<typeof notificationJobSchema>;

// ─────────────────────────────────────────────────────────────
// EMAIL
// ─────────────────────────────────────────────────────────────

export const emailJobSchema = z.object({
  type: z.literal('email:send'),
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  /** HTML body */
  html: z.string().optional(),
  /** Plain text fallback */
  text: z.string().optional(),
  /** Template identifier (if using a template engine) */
  templateId: z.string().optional(),
  templateData: z.record(z.unknown()).optional(),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
});

export type EmailJobPayload = z.infer<typeof emailJobSchema>;

// ─────────────────────────────────────────────────────────────
// CONTENT MODERATION
// ─────────────────────────────────────────────────────────────

export const contentModerationJobSchema = baseJobSchema.extend({
  type: z.literal('content:moderation'),
  contentId: z.string().uuid(),
  contentType: z.string(),
  payload: z.record(z.unknown()),
});

export type ContentModerationJobPayload = z.infer<typeof contentModerationJobSchema>;

// ─────────────────────────────────────────────────────────────
// UNION TYPE (all payloads)
// ─────────────────────────────────────────────────────────────

export type AnyJobPayload =
  | AITextJobPayload
  | AIImageJobPayload
  | AIVoiceJobPayload
  | VideoGenerationJobPayload
  | VideoRenderingJobPayload
  | SocialPublishJobPayload
  | AnalyticsSyncJobPayload
  | NotificationJobPayload
  | EmailJobPayload
  | ContentModerationJobPayload;

// ─────────────────────────────────────────────────────────────
// DEFAULT BULLMQ OPTIONS PER QUEUE
// ─────────────────────────────────────────────────────────────

import type { JobsOptions } from 'bullmq';

export const DEFAULT_JOB_OPTIONS: Record<QueueName, JobsOptions> = {
  [QUEUE_NAMES.AI_TEXT]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
  [QUEUE_NAMES.AI_IMAGE]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
  [QUEUE_NAMES.AI_VOICE]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
  [QUEUE_NAMES.AI_AVATAR]: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
  [QUEUE_NAMES.AI_TRANSCRIPTION]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
  [QUEUE_NAMES.AI_CAPTION]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 3_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
  [QUEUE_NAMES.VIDEO_GENERATION]: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 15_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
  [QUEUE_NAMES.VIDEO_RENDERING]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 30_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
  [QUEUE_NAMES.VIDEO_THUMBNAIL]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
  [QUEUE_NAMES.SOCIAL_PUBLISH]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1_000 },
  },
  [QUEUE_NAMES.SOCIAL_ANALYTICS_SYNC]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 30_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
  [QUEUE_NAMES.NOTIFICATION_SEND]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1_000 },
    removeOnComplete: { count: 1_000 },
    removeOnFail: { count: 500 },
  },
  [QUEUE_NAMES.EMAIL_SEND]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 1_000 },
    removeOnFail: { count: 500 },
  },
  [QUEUE_NAMES.CONTENT_MODERATION]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
};
