"use strict";
/**
 * AI Content OS — Shared Queue Definitions
 *
 * Central contract between the API and Background Workers.
 * All queue names and payload schemas live here to ensure type safety
 * and prevent runtime mismatches between producers and consumers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_JOB_OPTIONS = exports.contentModerationJobSchema = exports.emailJobSchema = exports.notificationJobSchema = exports.analyticsSyncJobSchema = exports.socialPublishJobSchema = exports.videoRenderingJobSchema = exports.videoGenerationJobSchema = exports.aiVoiceJobSchema = exports.aiImageJobSchema = exports.aiTextJobSchema = exports.QUEUE_NAMES = void 0;
const zod_1 = require("zod");
// ─────────────────────────────────────────────────────────────
// QUEUE NAMES
// ─────────────────────────────────────────────────────────────
exports.QUEUE_NAMES = {
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
};
// ─────────────────────────────────────────────────────────────
// SHARED FIELD SCHEMAS
// ─────────────────────────────────────────────────────────────
const baseJobSchema = zod_1.z.object({
    /** ID of the user who triggered the job */
    userId: zod_1.z.string().uuid(),
    /** Organization this job belongs to */
    organizationId: zod_1.z.string().uuid(),
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: zod_1.z.string().min(1).optional(),
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: zod_1.z.number().int().min(0).default(0),
});
// ─────────────────────────────────────────────────────────────
// AI TEXT GENERATION
// ─────────────────────────────────────────────────────────────
exports.aiTextJobSchema = baseJobSchema.extend({
    type: zod_1.z.literal('ai:text'),
    prompt: zod_1.z.string().min(1).max(50_000),
    systemPrompt: zod_1.z.string().max(10_000).optional(),
    maxTokens: zod_1.z.number().int().min(1).max(32_768).optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    /** The record this generation is for — e.g. "script", "caption" */
    referenceType: zod_1.z.string().optional(),
    referenceId: zod_1.z.string().uuid().optional(),
    /** Provider overrides */
    preferredProvider: zod_1.z.string().optional(),
    preferredModel: zod_1.z.string().optional(),
});
// ─────────────────────────────────────────────────────────────
// AI IMAGE GENERATION
// ─────────────────────────────────────────────────────────────
exports.aiImageJobSchema = baseJobSchema.extend({
    type: zod_1.z.literal('ai:image'),
    imageId: zod_1.z.string().uuid(),
    prompt: zod_1.z.string().min(1).max(8_000),
    negativePrompt: zod_1.z.string().max(4_000).optional(),
    width: zod_1.z.number().int().min(256).max(2048).optional(),
    height: zod_1.z.number().int().min(256).max(2048).optional(),
    numberOfImages: zod_1.z.number().int().min(1).max(4).default(1),
    aspectRatio: zod_1.z.string().optional(),
    style: zod_1.z.string().max(200).optional(),
    quality: zod_1.z.enum(['standard', 'hd']).default('standard'),
});
// ─────────────────────────────────────────────────────────────
// AI VOICE GENERATION
// ─────────────────────────────────────────────────────────────
exports.aiVoiceJobSchema = baseJobSchema.extend({
    type: zod_1.z.literal('ai:voice'),
    audioId: zod_1.z.string().uuid(),
    text: zod_1.z.string().min(1).max(10_000),
    voiceId: zod_1.z.string().optional(),
    language: zod_1.z.string().default('en'),
    gender: zod_1.z.enum(['male', 'female', 'neutral']).optional(),
    style: zod_1.z.string().optional(),
    emotion: zod_1.z.string().optional(),
    speed: zod_1.z.number().min(0.25).max(4).default(1),
    outputFormat: zod_1.z.enum(['mp3', 'wav', 'ogg', 'flac']).default('mp3'),
});
// ─────────────────────────────────────────────────────────────
// VIDEO GENERATION (AI provider — e.g. RunwayML, Kling)
// ─────────────────────────────────────────────────────────────
exports.videoGenerationJobSchema = baseJobSchema.extend({
    type: zod_1.z.literal('video:generation'),
    action: zod_1.z.enum(['generate', 'poll']),
    videoId: zod_1.z.string().uuid(),
    input: zod_1.z.object({
        prompt: zod_1.z.string().max(4_000).optional(),
        imageUrl: zod_1.z.string().url().optional(),
        scriptText: zod_1.z.string().max(20_000).optional(),
        durationSec: zod_1.z.number().int().min(1).max(300).optional(),
        aspectRatio: zod_1.z.enum(['16:9', '9:16', '1:1']).default('16:9'),
        style: zod_1.z.string().max(200).optional(),
    }),
    /** Provider task ID for polling — only present when action === "poll" */
    providerTaskId: zod_1.z.string().optional(),
    startedAt: zod_1.z.number().optional(),
});
// ─────────────────────────────────────────────────────────────
// VIDEO RENDERING (FFmpeg / Remotion — compose scenes)
// ─────────────────────────────────────────────────────────────
exports.videoRenderingJobSchema = baseJobSchema.extend({
    type: zod_1.z.literal('video:rendering'),
    videoProjectId: zod_1.z.string().uuid(),
    outputFormat: zod_1.z.enum(['mp4', 'webm', 'mov']).default('mp4'),
    resolution: zod_1.z.enum(['1080p', '720p', '480p', '4k']).default('1080p'),
    fps: zod_1.z.number().int().min(12).max(60).default(30),
});
// ─────────────────────────────────────────────────────────────
// SOCIAL PUBLISHING
// ─────────────────────────────────────────────────────────────
exports.socialPublishJobSchema = baseJobSchema.extend({
    type: zod_1.z.literal('social:publish'),
    socialPostId: zod_1.z.string().uuid(),
    publishingJobId: zod_1.z.string().uuid(),
    /** Attempt number — used for exponential backoff */
    attemptNumber: zod_1.z.number().int().min(1).default(1),
    /** Earliest time to attempt — for scheduling and backoff */
    scheduledAt: zod_1.z.string().datetime().optional(),
});
// ─────────────────────────────────────────────────────────────
// ANALYTICS SYNC
// ─────────────────────────────────────────────────────────────
exports.analyticsSyncJobSchema = baseJobSchema.extend({
    type: zod_1.z.literal('social:analytics-sync'),
    socialAccountId: zod_1.z.string().uuid(),
    platform: zod_1.z.string(),
    /** Sync posts up to this date (defaults to today) */
    syncUntilDate: zod_1.z.string().datetime().optional(),
});
// ─────────────────────────────────────────────────────────────
// NOTIFICATION
// ─────────────────────────────────────────────────────────────
exports.notificationJobSchema = zod_1.z.object({
    type: zod_1.z.literal('notification:send'),
    notificationType: zod_1.z.string(),
    targetUserId: zod_1.z.string().uuid(),
    organizationId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.unknown()).optional(),
    channels: zod_1.z.array(zod_1.z.enum(['in-app', 'email', 'push'])).default(['in-app']),
});
// ─────────────────────────────────────────────────────────────
// EMAIL
// ─────────────────────────────────────────────────────────────
exports.emailJobSchema = zod_1.z.object({
    type: zod_1.z.literal('email:send'),
    to: zod_1.z.string().email(),
    subject: zod_1.z.string().min(1).max(500),
    /** HTML body */
    html: zod_1.z.string().optional(),
    /** Plain text fallback */
    text: zod_1.z.string().optional(),
    /** Template identifier (if using a template engine) */
    templateId: zod_1.z.string().optional(),
    templateData: zod_1.z.record(zod_1.z.unknown()).optional(),
    from: zod_1.z.string().email().optional(),
    replyTo: zod_1.z.string().email().optional(),
});
// ─────────────────────────────────────────────────────────────
// CONTENT MODERATION
// ─────────────────────────────────────────────────────────────
exports.contentModerationJobSchema = baseJobSchema.extend({
    type: zod_1.z.literal('content:moderation'),
    contentId: zod_1.z.string().uuid(),
    contentType: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.unknown()),
});
exports.DEFAULT_JOB_OPTIONS = {
    [exports.QUEUE_NAMES.AI_TEXT]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
    },
    [exports.QUEUE_NAMES.AI_IMAGE]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
    },
    [exports.QUEUE_NAMES.AI_VOICE]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
    },
    [exports.QUEUE_NAMES.AI_AVATAR]: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
    },
    [exports.QUEUE_NAMES.AI_TRANSCRIPTION]: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
    },
    [exports.QUEUE_NAMES.AI_CAPTION]: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 3_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
    },
    [exports.QUEUE_NAMES.VIDEO_GENERATION]: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
    },
    [exports.QUEUE_NAMES.VIDEO_RENDERING]: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 30_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
    },
    [exports.QUEUE_NAMES.VIDEO_THUMBNAIL]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
    },
    [exports.QUEUE_NAMES.SOCIAL_PUBLISH]: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1_000 },
    },
    [exports.QUEUE_NAMES.SOCIAL_ANALYTICS_SYNC]: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 30_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
    },
    [exports.QUEUE_NAMES.NOTIFICATION_SEND]: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 500 },
    },
    [exports.QUEUE_NAMES.EMAIL_SEND]: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 500 },
    },
    [exports.QUEUE_NAMES.CONTENT_MODERATION]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
    },
};
//# sourceMappingURL=index.js.map