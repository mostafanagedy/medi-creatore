# AI Content OS — Technical Architecture

## 1. System Overview

AI Content OS is a multi-tenant SaaS platform built as a **modular monolith** designed for future microservice extraction. It provides AI-powered content creation, video generation, social media management, analytics, and personal branding tools.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│   Next.js App (web)  ·  Landing Page  ·  Admin UI                 │
└────────────────────────────┬───────────────────────────────────────┘
                             │ HTTPS / WSS
┌────────────────────────────▼───────────────────────────────────────┐
│                          API GATEWAY                                │
│        NestJS REST API  ·  WebSocket Gateway  ·  Swagger           │
│        Rate Limiting  ·  CORS  ·  Auth Guards  ·  RBAC            │
└──┬──────────────┬────────────┬────────────┬─────────────┬──────────┘
   │              │            │            │             │
┌──▼──┐      ┌───▼───┐   ┌────▼──┐    ┌───▼────┐   ┌───▼───┐
│Auth │      │Project│   │  AI   │    │ Social │   │Billing│
│Users│      │Assets │   │Gateway│    │Gateway │   │Credits│
│Orgs │      │Media  │   │Router │    │Publish │   │Stripe │
└─────┘      └───────┘   └────┬──┘    └───┬────┘   └───────┘
                              │           │
                    ┌─────────▼─────┐  ┌──▼──────────┐
                    │  AI Providers │  │Soc. Providers│
                    │  OpenAI       │  │  Facebook    │
                    │  Anthropic    │  │  Instagram   │
                    │  Google       │  │  YouTube     │
                    │  ElevenLabs   │  │  TikTok      │
                    │  RunwayML     │  │  Telegram    │
                    └───────────────┘  └──────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       BACKGROUND LAYER                              │
│              BullMQ Workers  ·  Redis Queue                        │
│   video-generation · audio · image · transcription                 │
│   social-publishing · analytics-sync · notifications               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                    │
│         PostgreSQL (Prisma)  ·  Redis (cache/queue)                │
│         S3-compatible storage  ·  Audit logs                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Monorepo Structure

```
ai-content-os/
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   │   ├── app/               # App Router pages
│   │   ├── components/        # UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── stores/            # Zustand stores
│   │   ├── lib/               # Utilities
│   │   └── public/
│   ├── api/                   # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/       # Feature modules
│   │   │   ├── common/        # Shared utilities
│   │   │   ├── config/        # Configuration
│   │   │   └── main.ts
│   │   └── prisma/
│   └── worker/                # BullMQ workers
│       └── src/
│           ├── processors/    # Job processors
│           └── main.ts
├── packages/
│   ├── types/                 # Shared TypeScript types
│   ├── ui/                    # Shared UI components
│   ├── config/                # Shared config
│   ├── ai/                    # AI provider abstractions
│   ├── social/                # Social provider abstractions
│   ├── video/                 # Video processing utilities
│   ├── database/              # Prisma client + schema
│   ├── eslint-config/
│   └── tsconfig/
├── docs/
├── infrastructure/
│   ├── docker/
│   └── k8s/
└── .github/
    └── workflows/
```

---

## 4. Backend Module Structure (NestJS)

```
src/modules/
├── auth/           # JWT, OAuth, sessions, password reset
├── users/          # User profile, preferences
├── organizations/  # Orgs, memberships, roles
├── projects/       # Project CRUD, status
├── assets/         # Media library, S3 management
├── scripts/        # AI script generation, versioning
├── videos/         # Video CRUD, rendering pipeline
├── audio/          # Voice generation
├── images/         # Image generation
├── avatars/        # Avatar generation
├── thumbnails/     # Thumbnail generation
├── captions/       # Caption + subtitle generation
├── ai/             # AI Gateway + Router + tracking
├── social/         # Social account management
├── publishing/     # Post creation + publishing pipeline
├── scheduling/     # Content calendar, cron scheduling
├── analytics/      # Metrics sync + analysis
├── billing/        # Subscription management
├── credits/        # Credit wallet + transactions
├── notifications/  # In-app, email, push
├── templates/      # Reusable content templates
├── brand/          # Brand profile + voice
├── repurpose/      # Content repurposing pipeline
├── ideas/          # AI content ideas
├── planner/        # AI content planner
├── admin/          # Admin-only controls
└── health/         # Health + readiness checks
```

---

## 5. AI Gateway Architecture

```
AI Gateway
│
├── TextProvider interface
│   ├── OpenAITextProvider
│   ├── AnthropicTextProvider
│   ├── GoogleTextProvider
│   └── MockTextProvider (dev only)
│
├── ImageProvider interface
│   ├── OpenAIImageProvider (DALL-E)
│   ├── StabilityAIProvider
│   └── MockImageProvider (dev only)
│
├── VideoProvider interface
│   ├── RunwayMLProvider
│   ├── PikaLabsProvider
│   └── MockVideoProvider (dev only)
│
├── VoiceProvider interface
│   ├── ElevenLabsProvider
│   ├── OpenAIVoiceProvider
│   └── MockVoiceProvider (dev only)
│
└── AvatarProvider interface
    ├── HeyGenProvider
    ├── SynthesiaProvider
    └── MockAvatarProvider (dev only)

AI Model Router:
  - Routes by: task, quality_tier, user_plan, provider_availability
  - Supports: primary + fallback provider chains
  - Tracks: all requests, tokens, cost, latency, status
```

---

## 6. Social Provider Architecture

```
Social Gateway
│
├── SocialProvider interface
│   connect() / disconnect() / refreshToken()
│   getProfile() / publishPost() / publishVideo()
│   schedulePost() / getAnalytics()
│
├── Implementations:
│   ├── FacebookProvider  (Meta Graph API)
│   ├── InstagramProvider (Meta Graph API)
│   ├── YouTubeProvider   (YouTube Data API v3)
│   ├── TikTokProvider    (TikTok Content Posting API)
│   ├── TelegramProvider  (Telegram Bot API)
│   └── WhatsAppProvider  (WhatsApp Business Cloud API)
│
└── Publishing Pipeline:
    Content → Validate → Platform Adapter → Upload →
    Publish → Verify → Store Platform ID → Analytics Sync
```

---

## 7. Background Job Architecture (BullMQ)

```
Queues:
├── video-generation       # AI video generation tasks
├── video-rendering        # FFmpeg rendering tasks
├── audio-generation       # TTS generation
├── image-generation       # AI image tasks
├── transcription          # Speech-to-text
├── caption-generation     # Auto subtitles
├── social-publishing      # Scheduled publishing
├── analytics-sync         # Metrics refresh
├── thumbnail-generation   # AI thumbnail tasks
├── content-repurposing    # Repurpose pipeline
└── notifications          # Email/push delivery

Each queue:
  - retries: 3 (exponential backoff)
  - timeout: configurable per job type
  - dead-letter: preserved for admin inspection
  - progress: 0-100% reported via SSE/WS
```

---

## 8. Database ERD (Key Entities)

```
User ──< Membership >── Organization
User ──< Session
User ──< CreditWallet ──< CreditTransaction
User ──< Notification

Organization ──< Project ──< Asset
Organization ──< SocialAccount
Organization ──< BrandProfile ──< BrandVoice
Organization ──< Subscription >── Plan

Project ──< Script
Project ──< Video ──< VideoScene
Project ──< Audio
Project ──< Image
Project ──< Caption
Project ──< Thumbnail
Project ──< SocialPost ──< SocialSchedule

AIProvider ──< AIModel
AIModel ──< AIRequest ──< AIUsage

SocialPost ──< AnalyticsSnapshot

Job (generic job tracking)
AuditLog
Template
FeatureFlag
```

---

## 9. Frontend Route Map

```
/ (landing page)
/pricing
/login
/register
/forgot-password
/reset-password
/verify-email
/onboarding (steps 1-7)

/dashboard                         # Overview
/dashboard/projects                # Project list
/dashboard/projects/[id]           # Project detail

/create/video                      # AI Video wizard
/create/image                      # AI Image generator
/create/script                     # AI Script generator
/create/voice                      # AI Voice generator
/create/avatar                     # AI Avatar
/create/thumbnail                  # AI Thumbnail

/content/projects                  # All projects
/content/media                     # Media library
/content/scripts                   # All scripts
/content/templates                 # Templates
/content/calendar                  # Content calendar

/social/accounts                   # Connected accounts
/social/posts                      # All posts
/social/scheduler                  # Post scheduler
/social/analytics                  # Social analytics

/ai/assistant                      # AI Chat assistant
/ai/ideas                          # Content ideas
/ai/planner                        # Content planner
/ai/brand                          # Brand voice
/ai/repurpose                      # Content repurposing

/billing/subscription              # Plan management
/billing/credits                   # Credit balance + history
/billing/usage                     # Usage breakdown

/settings/profile                  # User profile
/settings/organization             # Org settings
/settings/integrations             # Third-party integrations
/settings/security                 # Password, sessions
/settings/notifications            # Notification preferences

/admin                             # Admin overview
/admin/users                       # User management
/admin/organizations               # Org management
/admin/ai/providers                # AI provider config
/admin/ai/models                   # Model routing config
/admin/ai/requests                 # AI request log
/admin/ai/costs                    # Cost analysis
/admin/jobs                        # Job queue inspector
/admin/logs                        # System logs
/admin/health                      # System health
/admin/feature-flags               # Feature flags
```

---

## 10. API Specification (Key Endpoints)

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/verify-email
GET    /api/auth/me
GET    /api/auth/google
GET    /api/auth/google/callback
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

### AI Generation
```
POST   /api/scripts/generate
GET    /api/scripts/:id
PATCH  /api/scripts/:id
POST   /api/scripts/:id/variations

POST   /api/videos/generate
GET    /api/videos/:id
POST   /api/videos/:id/render
POST   /api/videos/:id/cancel
GET    /api/videos/:id/progress

POST   /api/images/generate
GET    /api/images/:id

POST   /api/audio/generate
GET    /api/audio/:id

POST   /api/avatars/generate
POST   /api/thumbnails/generate

POST   /api/captions/generate
POST   /api/bio/generate
POST   /api/ideas/generate
POST   /api/planner/generate
POST   /api/repurpose
```

### Media
```
POST   /api/media/upload-url     # Get signed upload URL
POST   /api/media
GET    /api/media
GET    /api/media/:id
DELETE /api/media/:id
```

### Social
```
GET    /api/social/accounts
POST   /api/social/:provider/connect
DELETE /api/social/:provider/:accountId/disconnect
POST   /api/social/:provider/:accountId/refresh

GET    /api/posts
POST   /api/posts
GET    /api/posts/:id
PATCH  /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/publish
POST   /api/posts/:id/schedule
POST   /api/posts/:id/cancel
POST   /api/posts/:id/retry

GET    /api/analytics
GET    /api/analytics/:accountId
```

### Billing
```
GET    /api/billing/plans
GET    /api/billing/subscription
POST   /api/billing/checkout
POST   /api/billing/portal
GET    /api/credits
GET    /api/credits/transactions
GET    /api/billing/usage
POST   /api/webhooks/stripe
```

### Admin
```
GET    /api/admin/users
PATCH  /api/admin/users/:id
GET    /api/admin/organizations
GET    /api/admin/ai/providers
POST   /api/admin/ai/providers
PATCH  /api/admin/ai/providers/:id
GET    /api/admin/ai/models
POST   /api/admin/ai/models
PATCH  /api/admin/ai/models/:id
GET    /api/admin/ai/requests
GET    /api/admin/ai/costs
GET    /api/admin/jobs
POST   /api/admin/jobs/:id/retry
GET    /api/admin/logs
GET    /api/admin/feature-flags
PATCH  /api/admin/feature-flags/:key
GET    /health
GET    /ready
```

---

## 11. Implementation Roadmap

### Phase 1 — Foundation (Current)
- Monorepo setup (Turborepo + pnpm)
- Shared packages: types, tsconfig, eslint-config
- Database package: Prisma schema (all entities)
- Backend: NestJS bootstrap, config, health
- Backend: Auth module (JWT, refresh tokens, OAuth, password reset)
- Backend: Users + Organizations + RBAC
- Frontend: Next.js setup, design system, layout
- Frontend: Landing page
- Frontend: Auth pages (login, register, forgot/reset password)
- Frontend: Dashboard shell + sidebar
- Docker Compose for local dev
- CI/CD skeleton

### Phase 2 — Core Content
- Projects module (CRUD + status)
- Media library (S3 uploads, signed URLs)
- AI Gateway + Router
- Script generator (text providers)
- AI tracking + credit deduction
- Frontend: Project pages, media library, script generator

### Phase 3 — AI Media
- Video generation pipeline (background jobs)
- Voice generation
- Image generation
- Avatar abstraction
- Thumbnail generator
- Caption/subtitle generation
- FFmpeg renderer worker
- Real-time job progress (SSE)
- Frontend: Video wizard, voice, image, avatar UIs

### Phase 4 — Social
- Social provider abstraction
- Facebook + Instagram integration
- YouTube integration
- TikTok integration (where API available)
- Telegram bot integration
- WhatsApp Business integration
- Content calendar
- Post scheduler
- Publishing pipeline + workers
- Frontend: Social management UI, calendar, scheduler

### Phase 5 — Analytics + Billing
- Analytics sync workers
- Analytics dashboard
- AI analytics assistant
- Stripe integration (subscriptions + webhooks)
- Credit system (wallet, transactions, usage rules)
- Plan enforcement
- Frontend: Analytics, billing, credits pages

### Phase 6 — Admin + Security
- Admin dashboard (all sections)
- Feature flags
- AI cost tracking
- Audit logs
- Rate limiting (Redis-backed)
- Security headers + CSRF
- Input validation hardening
- File upload security

### Phase 7 — Polish + Deploy
- Full test suite (unit, integration, e2e)
- API documentation (Swagger)
- All documentation files
- Docker production builds
- CI/CD completion
- Performance optimization
- Accessibility audit
- i18n (English + Arabic + RTL)
