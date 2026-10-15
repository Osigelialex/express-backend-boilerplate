# syntax=docker/dockerfile:1.7
#
# One Dockerfile, several targets:
#   dev   - all deps + tooling, source is bind-mounted (docker-compose.dev.yml)
#   prod  - minimal runtime image (default; what CI builds and ships)
#
#   docker build -t my-app .                       # production image
#   docker build --target dev -t my-app:dev .      # development image

ARG NODE_VERSION=22

# ---------------------------------------------------------------------------
# base: Node + pnpm (version pinned by package.json "packageManager")
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# openssl: required by the Prisma query engine on Alpine.
RUN apk add --no-cache openssl \
 && corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------
# dev: everything, hot reload via nodemon (see docker-compose.dev.yml)
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile && pnpm exec prisma generate
COPY . .
EXPOSE 4000
CMD ["pnpm", "dev"]

# ---------------------------------------------------------------------------
# deps: production-only node_modules (+ generated Prisma client)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --prod \
 && pnpm exec prisma generate

# ---------------------------------------------------------------------------
# build: compile TypeScript -> dist/
# ---------------------------------------------------------------------------
FROM base AS build
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile && pnpm exec prisma generate
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
RUN pnpm build

# ---------------------------------------------------------------------------
# prod: runtime only - no pnpm, no devDependencies, no source, non-root user
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS prod
ENV NODE_ENV=production
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma

# Writable dir for optional file logs (LOG_TO_FILE=true).
RUN mkdir -p logs && chown node:node logs
USER node

EXPOSE 4000

# Liveness only (see routes/health.routes.ts). Workers override this in
# docker-compose.yml since they don't serve HTTP.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" >/dev/null 2>&1 || exit 1

# Apply pending migrations, then run the API. `exec` makes node PID 1 so it
# receives SIGTERM and shuts down gracefully. Workers run
# `node dist/src/workers/<name>.worker.js` instead (no migrate).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/src/index.js"]
