import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * Parses env-style booleans. `z.coerce.boolean()` is unsafe here because
 * Boolean("false") === true.
 */
const envBoolean = (defaultValue: boolean) =>
  z
    .preprocess((v) => {
      if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
      return v;
    }, z.boolean())
    .default(defaultValue);

/** Secrets that MUST be real, unique values in production. */
const PRODUCTION_REQUIRED_SECRETS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'COOKIE_SECRET',
  'ENCRYPTION_KEY',
] as const;

/** Matches values copied from .env.example (e.g. "your-...", "change-me", "YOUR_DB_HOST"). */
const PLACEHOLDER_PATTERN =
  /(^|[^a-z0-9])your[-_]|change[-_]?me|change[-_]in[-_]production|placeholder|ai_content_os_password/i;

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_URL: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Cookies
  COOKIE_SECRET: z.string().min(16).optional(),

  // Storage (S3-compatible)
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: envBoolean(false),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be 32+ chars for AES-256'),

  // AI Providers
  OLLAMA_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OMNIROUTE_API_KEY: z.string().optional(),
  OMNIROUTE_BASE_URL: z.string().default('http://localhost:20128/v1'),
  CODECRAFT_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  RUNWAYML_API_KEY: z.string().optional(),
  HEYGEN_API_KEY: z.string().optional(),
  STABILITY_API_KEY: z.string().optional(),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // OAuth - Meta (Facebook/Instagram)
  META_CLIENT_ID: z.string().optional(),
  META_CLIENT_SECRET: z.string().optional(),
  META_APP_ID: z.string().optional(),

  // OAuth - TikTok
  TIKTOK_CLIENT_ID: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),

  // OAuth - YouTube
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // WhatsApp Business
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@ai-content-os.com'),
  EMAIL_FROM_NAME: z.string().default('AI Content OS'),

  // Rate limiting
  RATE_LIMIT_GLOBAL: z.coerce.number().default(100),
  RATE_LIMIT_AUTH: z.coerce.number().default(10),
  RATE_LIMIT_AI: z.coerce.number().default(20),

  // Upload limits
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(500),
  MAX_VIDEO_SIZE_MB: z.coerce.number().default(2000),
}).superRefine((cfg, ctx) => {
  // Enforce on every internet-facing environment (staging included).
  if (cfg.NODE_ENV !== 'production' && cfg.NODE_ENV !== 'staging') return;

  // 1. Required secrets must be present and must not be placeholders.
  for (const key of PRODUCTION_REQUIRED_SECRETS) {
    const value = cfg[key];
    if (!value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required in production` });
    } else if (PLACEHOLDER_PATTERN.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} still contains a placeholder value — generate a real secret`,
      });
    }
  }

  // 2. JWT access and refresh secrets must differ.
  if (cfg.JWT_SECRET && cfg.JWT_SECRET === cfg.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_REFRESH_SECRET must differ from JWT_SECRET',
    });
  }

  // 3. Any other configured value must not be a copied placeholder
  //    (unset optional integrations instead of leaving example values).
  const alreadyChecked = new Set<string>(PRODUCTION_REQUIRED_SECRETS);
  for (const [key, value] of Object.entries(cfg)) {
    if (alreadyChecked.has(key) || typeof value !== 'string') continue;
    if (PLACEHOLDER_PATTERN.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} contains a placeholder value — set a real value or remove it`,
      });
    }
  }
});

export type AppConfigType = z.infer<typeof configSchema>;

export function validateConfig(config: Record<string, unknown>): AppConfigType {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `${key}: ${msgs?.join(', ')}`)
      .join('\n');
    throw new Error(`❌ Invalid environment configuration:\n${messages}`);
  }
  return result.data;
}

export const AppConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
}));
