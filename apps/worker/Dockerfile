# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN corepack enable \
 && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
COPY packages/database/prisma packages/database/prisma
COPY packages/tsconfig/ packages/tsconfig/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter @ai-content-os/worker...
RUN pnpm --filter @ai-content-os/worker exec prisma generate --schema ../../packages/database/prisma/schema.prisma

FROM deps AS development
COPY . .
ENV NODE_ENV=development
CMD ["pnpm", "--filter", "@ai-content-os/worker", "dev"]

FROM deps AS build
COPY apps/worker apps/worker
COPY packages/types packages/types
RUN pnpm --filter @ai-content-os/worker build

FROM build AS prune
RUN pnpm prune --prod

FROM node:${NODE_VERSION}-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app/apps/worker
COPY --from=prune --chown=node:node /app/node_modules /app/node_modules
COPY --from=prune --chown=node:node /app/apps/worker/node_modules ./node_modules
COPY --from=prune --chown=node:node /app/apps/worker/dist ./dist
COPY --from=prune --chown=node:node /app/apps/worker/package.json ./package.json
USER node
CMD ["node", "dist/main.js"]
