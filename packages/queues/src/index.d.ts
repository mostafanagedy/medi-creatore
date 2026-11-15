/**
 * AI Content OS — Shared Queue Definitions
 *
 * Central contract between the API and Background Workers.
 * All queue names and payload schemas live here to ensure type safety
 * and prevent runtime mismatches between producers and consumers.
 */
import { z } from 'zod';
export declare const QUEUE_NAMES: {
    readonly AI_TEXT: "ai:text";
    readonly AI_IMAGE: "ai:image";
    readonly AI_VOICE: "ai:voice";
    readonly AI_AVATAR: "ai:avatar";
    readonly AI_TRANSCRIPTION: "ai:transcription";
    readonly AI_CAPTION: "ai:caption";
    readonly VIDEO_GENERATION: "video:generation";
    readonly VIDEO_RENDERING: "video:rendering";
    readonly VIDEO_THUMBNAIL: "video:thumbnail";
    readonly SOCIAL_PUBLISH: "social:publish";
    readonly SOCIAL_ANALYTICS_SYNC: "social:analytics-sync";
    readonly NOTIFICATION_SEND: "notification:send";
    readonly EMAIL_SEND: "email:send";
    readonly CONTENT_MODERATION: "content:moderation";
};
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export declare const aiTextJobSchema: z.ZodObject<{
    /** ID of the user who triggered the job */
    userId: z.ZodString;
    /** Organization this job belongs to */
    organizationId: z.ZodString;
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: z.ZodOptional<z.ZodString>;
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"ai:text">;
    prompt: z.ZodString;
    systemPrompt: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    temperature: z.ZodOptional<z.ZodNumber>;
    /** The record this generation is for — e.g. "script", "caption" */
    referenceType: z.ZodOptional<z.ZodString>;
    referenceId: z.ZodOptional<z.ZodString>;
    /** Provider overrides */
    preferredProvider: z.ZodOptional<z.ZodString>;
    preferredModel: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    organizationId: string;
    creditsCharged: number;
    type: "ai:text";
    prompt: string;
    idempotencyKey?: string | undefined;
    systemPrompt?: string | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    referenceType?: string | undefined;
    referenceId?: string | undefined;
    preferredProvider?: string | undefined;
    preferredModel?: string | undefined;
}, {
    userId: string;
    organizationId: string;
    type: "ai:text";
    prompt: string;
    idempotencyKey?: string | undefined;
    creditsCharged?: number | undefined;
    systemPrompt?: string | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    referenceType?: string | undefined;
    referenceId?: string | undefined;
    preferredProvider?: string | undefined;
    preferredModel?: string | undefined;
}>;
export type AITextJobPayload = z.infer<typeof aiTextJobSchema>;
export declare const aiImageJobSchema: z.ZodObject<{
    /** ID of the user who triggered the job */
    userId: z.ZodString;
    /** Organization this job belongs to */
    organizationId: z.ZodString;
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: z.ZodOptional<z.ZodString>;
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"ai:image">;
    imageId: z.ZodString;
    prompt: z.ZodString;
    negativePrompt: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    numberOfImages: z.ZodDefault<z.ZodNumber>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    style: z.ZodOptional<z.ZodString>;
    quality: z.ZodDefault<z.ZodEnum<["standard", "hd"]>>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    organizationId: string;
    creditsCharged: number;
    type: "ai:image";
    prompt: string;
    imageId: string;
    numberOfImages: number;
    quality: "standard" | "hd";
    idempotencyKey?: string | undefined;
    negativePrompt?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    aspectRatio?: string | undefined;
    style?: string | undefined;
}, {
    userId: string;
    organizationId: string;
    type: "ai:image";
    prompt: string;
    imageId: string;
    idempotencyKey?: string | undefined;
    creditsCharged?: number | undefined;
    negativePrompt?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    numberOfImages?: number | undefined;
    aspectRatio?: string | undefined;
    style?: string | undefined;
    quality?: "standard" | "hd" | undefined;
}>;
export type AIImageJobPayload = z.infer<typeof aiImageJobSchema>;
export declare const aiVoiceJobSchema: z.ZodObject<{
    /** ID of the user who triggered the job */
    userId: z.ZodString;
    /** Organization this job belongs to */
    organizationId: z.ZodString;
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: z.ZodOptional<z.ZodString>;
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"ai:voice">;
    audioId: z.ZodString;
    text: z.ZodString;
    voiceId: z.ZodOptional<z.ZodString>;
    language: z.ZodDefault<z.ZodString>;
    gender: z.ZodOptional<z.ZodEnum<["male", "female", "neutral"]>>;
    style: z.ZodOptional<z.ZodString>;
    emotion: z.ZodOptional<z.ZodString>;
    speed: z.ZodDefault<z.ZodNumber>;
    outputFormat: z.ZodDefault<z.ZodEnum<["mp3", "wav", "ogg", "flac"]>>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    organizationId: string;
    creditsCharged: number;
    type: "ai:voice";
    audioId: string;
    text: string;
    language: string;
    speed: number;
    outputFormat: "mp3" | "wav" | "ogg" | "flac";
    idempotencyKey?: string | undefined;
    style?: string | undefined;
    voiceId?: string | undefined;
    gender?: "male" | "female" | "neutral" | undefined;
    emotion?: string | undefined;
}, {
    userId: string;
    organizationId: string;
    type: "ai:voice";
    audioId: string;
    text: string;
    idempotencyKey?: string | undefined;
    creditsCharged?: number | undefined;
    style?: string | undefined;
    voiceId?: string | undefined;
    language?: string | undefined;
    gender?: "male" | "female" | "neutral" | undefined;
    emotion?: string | undefined;
    speed?: number | undefined;
    outputFormat?: "mp3" | "wav" | "ogg" | "flac" | undefined;
}>;
export type AIVoiceJobPayload = z.infer<typeof aiVoiceJobSchema>;
export declare const videoGenerationJobSchema: z.ZodObject<{
    /** ID of the user who triggered the job */
    userId: z.ZodString;
    /** Organization this job belongs to */
    organizationId: z.ZodString;
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: z.ZodOptional<z.ZodString>;
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"video:generation">;
    action: z.ZodEnum<["generate", "poll"]>;
    videoId: z.ZodString;
    input: z.ZodObject<{
        prompt: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        scriptText: z.ZodOptional<z.ZodString>;
        durationSec: z.ZodOptional<z.ZodNumber>;
        aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
        style: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        aspectRatio: "16:9" | "9:16" | "1:1";
        prompt?: string | undefined;
        style?: string | undefined;
        imageUrl?: string | undefined;
        scriptText?: string | undefined;
        durationSec?: number | undefined;
    }, {
        prompt?: string | undefined;
        aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
        style?: string | undefined;
        imageUrl?: string | undefined;
        scriptText?: string | undefined;
        durationSec?: number | undefined;
    }>;
    /** Provider task ID for polling — only present when action === "poll" */
    providerTaskId: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    organizationId: string;
    creditsCharged: number;
    type: "video:generation";
    action: "generate" | "poll";
    videoId: string;
    input: {
        aspectRatio: "16:9" | "9:16" | "1:1";
        prompt?: string | undefined;
        style?: string | undefined;
        imageUrl?: string | undefined;
        scriptText?: string | undefined;
        durationSec?: number | undefined;
    };
    idempotencyKey?: string | undefined;
    providerTaskId?: string | undefined;
    startedAt?: number | undefined;
}, {
    userId: string;
    organizationId: string;
    type: "video:generation";
    action: "generate" | "poll";
    videoId: string;
    input: {
        prompt?: string | undefined;
        aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
        style?: string | undefined;
        imageUrl?: string | undefined;
        scriptText?: string | undefined;
        durationSec?: number | undefined;
    };
    idempotencyKey?: string | undefined;
    creditsCharged?: number | undefined;
    providerTaskId?: string | undefined;
    startedAt?: number | undefined;
}>;
export type VideoGenerationJobPayload = z.infer<typeof videoGenerationJobSchema>;
export declare const videoRenderingJobSchema: z.ZodObject<{
    /** ID of the user who triggered the job */
    userId: z.ZodString;
    /** Organization this job belongs to */
    organizationId: z.ZodString;
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: z.ZodOptional<z.ZodString>;
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"video:rendering">;
    videoProjectId: z.ZodString;
    outputFormat: z.ZodDefault<z.ZodEnum<["mp4", "webm", "mov"]>>;
    resolution: z.ZodDefault<z.ZodEnum<["1080p", "720p", "480p", "4k"]>>;
    fps: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    organizationId: string;
    creditsCharged: number;
    type: "video:rendering";
    outputFormat: "mp4" | "webm" | "mov";
    videoProjectId: string;
    resolution: "1080p" | "720p" | "480p" | "4k";
    fps: number;
    idempotencyKey?: string | undefined;
}, {
    userId: string;
    organizationId: string;
    type: "video:rendering";
    videoProjectId: string;
    idempotencyKey?: string | undefined;
    creditsCharged?: number | undefined;
    outputFormat?: "mp4" | "webm" | "mov" | undefined;
    resolution?: "1080p" | "720p" | "480p" | "4k" | undefined;
    fps?: number | undefined;
}>;
export type VideoRenderingJobPayload = z.infer<typeof videoRenderingJobSchema>;
export declare const socialPublishJobSchema: z.ZodObject<{
    /** ID of the user who triggered the job */
    userId: z.ZodString;
    /** Organization this job belongs to */
    organizationId: z.ZodString;
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: z.ZodOptional<z.ZodString>;
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"social:publish">;
    socialPostId: z.ZodString;
    publishingJobId: z.ZodString;
    /** Attempt number — used for exponential backoff */
    attemptNumber: z.ZodDefault<z.ZodNumber>;
    /** Earliest time to attempt — for scheduling and backoff */
    scheduledAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    organizationId: string;
    creditsCharged: number;
    type: "social:publish";
    socialPostId: string;
    publishingJobId: string;
    attemptNumber: number;
    idempotencyKey?: string | undefined;
    scheduledAt?: string | undefined;
}, {
    userId: string;
    organizationId: string;
    type: "social:publish";
    socialPostId: string;
    publishingJobId: string;
    idempotencyKey?: string | undefined;
    creditsCharged?: number | undefined;
    attemptNumber?: number | undefined;
    scheduledAt?: string | undefined;
}>;
export type SocialPublishJobPayload = z.infer<typeof socialPublishJobSchema>;
export declare const analyticsSyncJobSchema: z.ZodObject<{
    /** ID of the user who triggered the job */
    userId: z.ZodString;
    /** Organization this job belongs to */
    organizationId: z.ZodString;
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: z.ZodOptional<z.ZodString>;
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"social:analytics-sync">;
    socialAccountId: z.ZodString;
    platform: z.ZodString;
    /** Sync posts up to this date (defaults to today) */
    syncUntilDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    organizationId: string;
    creditsCharged: number;
    type: "social:analytics-sync";
    socialAccountId: string;
    platform: string;
    idempotencyKey?: string | undefined;
    syncUntilDate?: string | undefined;
}, {
    userId: string;
    organizationId: string;
    type: "social:analytics-sync";
    socialAccountId: string;
    platform: string;
    idempotencyKey?: string | undefined;
    creditsCharged?: number | undefined;
    syncUntilDate?: string | undefined;
}>;
export type AnalyticsSyncJobPayload = z.infer<typeof analyticsSyncJobSchema>;
export declare const notificationJobSchema: z.ZodObject<{
    type: z.ZodLiteral<"notification:send">;
    notificationType: z.ZodString;
    targetUserId: z.ZodString;
    organizationId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    channels: z.ZodDefault<z.ZodArray<z.ZodEnum<["in-app", "email", "push"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "notification:send";
    notificationType: string;
    targetUserId: string;
    title: string;
    channels: ("push" | "in-app" | "email")[];
    organizationId?: string | undefined;
    data?: Record<string, unknown> | undefined;
}, {
    message: string;
    type: "notification:send";
    notificationType: string;
    targetUserId: string;
    title: string;
    organizationId?: string | undefined;
    data?: Record<string, unknown> | undefined;
    channels?: ("push" | "in-app" | "email")[] | undefined;
}>;
export type NotificationJobPayload = z.infer<typeof notificationJobSchema>;
export declare const emailJobSchema: z.ZodObject<{
    type: z.ZodLiteral<"email:send">;
    to: z.ZodString;
    subject: z.ZodString;
    /** HTML body */
    html: z.ZodOptional<z.ZodString>;
    /** Plain text fallback */
    text: z.ZodOptional<z.ZodString>;
    /** Template identifier (if using a template engine) */
    templateId: z.ZodOptional<z.ZodString>;
    templateData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    from: z.ZodOptional<z.ZodString>;
    replyTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "email:send";
    to: string;
    subject: string;
    text?: string | undefined;
    html?: string | undefined;
    templateId?: string | undefined;
    templateData?: Record<string, unknown> | undefined;
    from?: string | undefined;
    replyTo?: string | undefined;
}, {
    type: "email:send";
    to: string;
    subject: string;
    text?: string | undefined;
    html?: string | undefined;
    templateId?: string | undefined;
    templateData?: Record<string, unknown> | undefined;
    from?: string | undefined;
    replyTo?: string | undefined;
}>;
export type EmailJobPayload = z.infer<typeof emailJobSchema>;
export declare const contentModerationJobSchema: z.ZodObject<{
    /** ID of the user who triggered the job */
    userId: z.ZodString;
    /** Organization this job belongs to */
    organizationId: z.ZodString;
    /** Idempotency key — prevents duplicate processing */
    idempotencyKey: z.ZodOptional<z.ZodString>;
    /** Credits already charged for this job (used for refund on failure) */
    creditsCharged: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"content:moderation">;
    contentId: z.ZodString;
    contentType: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    organizationId: string;
    creditsCharged: number;
    type: "content:moderation";
    contentId: string;
    contentType: string;
    payload: Record<string, unknown>;
    idempotencyKey?: string | undefined;
}, {
    userId: string;
    organizationId: string;
    type: "content:moderation";
    contentId: string;
    contentType: string;
    payload: Record<string, unknown>;
    idempotencyKey?: string | undefined;
    creditsCharged?: number | undefined;
}>;
export type ContentModerationJobPayload = z.infer<typeof contentModerationJobSchema>;
export type AnyJobPayload = AITextJobPayload | AIImageJobPayload | AIVoiceJobPayload | VideoGenerationJobPayload | VideoRenderingJobPayload | SocialPublishJobPayload | AnalyticsSyncJobPayload | NotificationJobPayload | EmailJobPayload | ContentModerationJobPayload;
import type { JobsOptions } from 'bullmq';
export declare const DEFAULT_JOB_OPTIONS: Record<QueueName, JobsOptions>;
//# sourceMappingURL=index.d.ts.map