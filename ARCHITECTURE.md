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

## 12. Production Readiness Assessment and Execution Plan

The architecture above describes the target system, not the current implementation.
Use the following sequence to close the production gaps without building every
provider and dashboard before validating a complete user workflow.

### Current implementation notes

- `apps/worker` provides a NestJS BullMQ consumer and registers all 11 queues.
  The API enqueues charged video requests; the video worker submits them to
  Runway, polls asynchronously, persists status/output on the Video record, and
  refunds credits once on terminal failure. The remaining processors are explicit
  unrecoverable scaffolds until their provider/business logic is implemented.
- Video output currently stores the provider's URL rather than copying the media
  into S3-compatible storage. Provider/model routing, AI cost telemetry, and an
  outbox for atomic DB-to-Redis enqueueing remain launch risks.
- The API has AI provider adapters and core modules, but social OAuth currently
  reports that credentials are not configured, and publishing only records a
  scheduled post. These are integration seams, not completed provider workflows.
- Stripe dependencies and schema fields exist, but there is no billing module
  yet. BullMQ is wired for video generation, but the remaining queues still need
  producers and working processors.
- The API already enables Helmet, request validation, and non-production
  Swagger. CORS currently includes localhost even when `FRONTEND_URL` is set;
  remove development origins from production. A Redis-backed rate limiter is
  not wired into the application.
- English/Arabic locale routing and Arabic document direction are present.
  Full RTL behavior still needs component-level verification and tests.
- Focused API video-submission and worker/provider tests now exist, but coverage
  of the rest of the application is incomplete and no GitHub Actions workflows
  were found in the repository.
- `docker-compose.yml` is a local-development setup with development credentials
  and should not be used as a production deployment configuration.

### Ordered delivery plan

| Priority | Stage | Scope and dependencies | Exit criteria |
| --- | --- | --- | --- |
| P0 | Release baseline | Choose the first supported product workflow, deployment target, and production domains. Add pull-request CI for lint, typecheck, build, and existing tests; add focused tests for auth, organization boundaries, and configuration. | A clean checkout can pass CI without production secrets; builds and migrations are reproducible; production configuration fails fast when required secrets or origins are missing. |
| P1 | Security and observability baseline | Make CORS environment-specific; wire Redis-backed limits with stricter AI/auth budgets; verify webhook signatures, encrypt provider tokens, audit organization scoping and uploads. Add structured logs, request correlation, error reporting (for example Sentry), and health/readiness checks. | Production origins are explicit; limits work across API replicas; sensitive credentials are never logged or stored in plaintext; errors can be traced to a request and health checks reflect database/Redis availability. |
| P2 | Background processing foundation | BullMQ, shared video job contracts, API video producer, Redis worker, and a Runway video processor are in place. Add producers/processors for the remaining queues, media persistence in S3, an outbox or equivalent enqueue consistency, bounded retries/backoff, failure retention, concurrency controls, and operational progress reporting. | Compose can build and run API plus worker; integration tests prove enqueue/process/retry/failure behavior and duplicate delivery does not duplicate side effects. |
| P3 | Billing and entitlement controls | Implement plans, subscriptions, Stripe checkout/portal/webhooks, and an append-only credit ledger. Make webhook handling idempotent and define reservation, charge, refund, and failure semantics before connecting paid AI calls. | Replayed/out-of-order webhooks do not duplicate entitlement or credit changes; each billable action has an auditable ledger trail and cannot overspend a wallet. |
| P4 | First AI production workflow | The authenticated video workflow now has queued execution, credit enforcement/refunds, persisted result/status, and user-visible polling. Add model routing/fallback, AI request/cost tracking, durable S3 output, cancellation, and equivalent end-to-end coverage for text generation. Keep provider keys server-side and apply cost-aware quotas. | Contract/integration tests cover success, timeout, provider failure, retry, cancellation, and credit reconciliation; measured usage is recorded for every completed or failed billable request. |
| P5 | Social publishing MVP | Implement one platform end-to-end before adding more: OAuth state/CSRF protection, encrypted refreshable tokens, permission handling, scheduling, worker publishing, idempotency, retry policy, and platform result persistence. | A scheduled post can be created, published, verified, retried safely, and disconnected; token expiry and provider rejection have explicit user-visible states. |
| P6 | Operations and admin | Add role-protected admin workflows for user/org support, job inspection/retry, feature flags, and AI cost visibility. Add audit trails and operational dashboards; introduce deeper APM/database tracing based on observed bottlenecks. | Privileged actions are authorization-tested and audited; operators can investigate failed jobs and unexpected spend without accessing raw secrets. |
| P7 | Production launch gates | Add production images and deployment automation for the selected host; configure secret-manager integration, migrations/rollback strategy, backups, alerts, load/failure tests, accessibility, and English/Arabic RTL regression coverage. | Staging deploy and rollback are rehearsed; backup restore is verified; SLO/alert ownership is defined; load and failure tests meet agreed targets; key Arabic routes pass RTL visual and interaction checks. |

### Scope control

Treat provider breadth as follow-up work: launch with one validated AI workflow and
one social platform, then add providers behind the established interfaces. Do not
choose Kubernetes, AWS, or Vercel deployment details until the hosting target and
operational constraints are agreed. Production launch should be gated on P0–P5;
P6 and P7 provide the operator controls and final verification needed before
general availability.
