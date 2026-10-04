# syntax=docker/dockerfile:1.7
#
# AI Content OS — NestJS API
# Build context MUST be the repository root:
#   docker build -f apps/api/Dockerfile --target production -t ai-content-os-api .
#
# Targets:
#   development  hot-reload image used by docker-compose
#   migrate      one-shot job: `prisma migrate deploy` (needs DATABASE_URL)
#   production   slim, non-root runtime image (default)
#
# Debian (glibc) base on purpose: Prisma, argon2 and sharp ship prebuilt
# binaries for it, so no extra Prisma binaryTargets / compilers are needed.

ARG NODE_VERSION=22

# ── base ─────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ── deps: install workspace deps for the API only (cached layer) ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/tsconfig/ packages/tsconfig/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter @ai-content-os/api...

# ── development: used by docker-compose (sources are bind-mounted) ──
FROM deps AS development
COPY . .
RUN pnpm --filter @ai-content-os/database db:generate
ENV NODE_ENV=development
EXPOSE 3001
CMD ["pnpm", "--filter", "@ai-content-os/api", "dev"]

# ── build: generate Prisma client + compile TypeScript ───────
FROM deps AS build
COPY packages/database packages/database
COPY apps/api apps/api
RUN pnpm --filter @ai-content-os/database db:generate \
 && pnpm --filter @ai-content-os/api build

# ── migrate: run DB migrations as a release step ─────────────
#   docker run --rm -e DATABASE_URL=... <image-built-with-target-migrate>
FROM build AS migrate
WORKDIR /app/packages/database
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# ── prune: drop devDependencies, keep the generated Prisma client ──
FROM build AS prune
RUN pnpm prune --prod

# ── production: minimal runtime ──────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS production
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app/apps/api
COPY --from=prune --chown=node:node /app/node_modules /app/node_modules
COPY --from=prune --chown=node:node /app/apps/api/node_modules ./node_modules
COPY --from=prune --chown=node:node /app/apps/api/dist ./dist
COPY --from=prune --chown=node:node /app/apps/api/package.json ./package.json
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
