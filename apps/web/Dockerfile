# syntax=docker/dockerfile:1.7
#
# AI Content OS — Next.js web app
# Build context MUST be the repository root:
#   docker build -f apps/web/Dockerfile --target production \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 \
#     --build-arg NEXT_PUBLIC_WS_URL=wss://api.example.com \
#     -t ai-content-os-web .
#
# NEXT_PUBLIC_* values are inlined into the browser bundle at BUILD time,
# so they must be passed as build args (not runtime env).
#
# Targets: development (docker-compose) | production (default, standalone, non-root)

ARG NODE_VERSION=22

# ── base ─────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ── deps ─────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/tsconfig/ packages/tsconfig/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter @ai-content-os/web...

# ── development: used by docker-compose ──────────────────────
FROM deps AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "--filter", "@ai-content-os/web", "dev"]

# ── build ────────────────────────────────────────────────────
FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_WS_URL=ws://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NODE_ENV=production
COPY packages/types packages/types
COPY apps/web apps/web
RUN pnpm --filter @ai-content-os/web build

# ── production: standalone server only ───────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS production
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
# apps/web/public is optional (not present yet); copy it when it exists:
#   COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
