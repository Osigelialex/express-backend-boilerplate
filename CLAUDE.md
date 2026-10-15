# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Express + TypeScript + Prisma (Postgres) + Redis + BullMQ + Socket.IO backend boilerplate. Package manager is **pnpm** (Node >= 20). Path alias `@/*` maps to `src/*` (resolved by `tsc-alias` at build, `moduleNameMapper` in Jest).

## Commands

```bash
pnpm dev                 # nodemon + tsx src/index.ts
pnpm build               # tsc -p tsconfig.build.json && tsc-alias
pnpm typecheck
pnpm lint / lint:fix
pnpm format / format:check

pnpm test                # unit tests only (no Postgres/Redis needed)
pnpm jest path/to/file.test.ts          # single unit test file
pnpm jest -t "test name"                # single test by name
pnpm test:e2e            # applies migrations via .env.test, then jest.e2e.config.ts --runInBand
pnpm jest --config jest.e2e.config.ts src/__tests__/e2e/auth.e2e.test.ts   # single e2e file (DB must be migrated)

pnpm generate            # prisma generate
pnpm migrate:dev         # create/apply a dev migration
pnpm migrate             # prisma migrate deploy
pnpm seed:dev            # scripts/dev.seed.ts

pnpm worker:email:dev / worker:maintenance:dev   # BullMQ workers (separate processes)
pnpm docker:dev          # full stack via docker-compose.dev.yml
```

CI (`.github/workflows/ci.yml`) runs lint, format:check, typecheck, unit tests with coverage, then e2e against Postgres 16 + Redis.

## Architecture

**Request flow** (`src/app.ts`): requestId → security headers → CORS → compression → `express.json` (100kb) → logging → health routes (before rate limiting) → rate limiters (auth limiter mounted before the general API limiter) → `/v1` routes → 404 → `errorHandler`.

**Layering**: `routes/*.routes.ts` → `validateRequest(zodSchema, source)` → controller → service → Prisma.
- `app.ts` only builds the Express app; `src/index.ts` listens, attaches Socket.IO, and handles graceful shutdown. Tests import `app` directly with supertest.
- New feature: add routes/controller/service/dto, then mount in `src/routes/v1/index.ts`.
- DTOs in `src/dtos` are Zod schemas; `validateRequest` **replaces** `req.body/params/query` with the parsed (stripped, coerced) value.
- Controllers extend `BaseController.handleRequest`, which wraps results in the `ApiResponse` envelope (a returned `PaginatedResult` yields the paginated envelope) and forwards errors to `next`. Controllers call one service method and hold no business logic.
- Routes instantiate controllers/services by hand (`new UserController(new UserService())`); a `@singleton` decorator exists for stateless services.
- Errors: throw `AppError` subclasses (`src/utils/appError.ts`) with codes from `src/utils/errorCodes.ts`; non-operational errors never leak their message to clients. Message strings live in `src/config/constants/`.
- `AdminService.listUsers` is the reference pattern for paginated + filtered lists (query DTO → `where` → `findMany`+`count` in one transaction → `PaginatedResult` via `getPagination`/`paginate`). Unique-constraint races are handled with `isUniqueViolation` (`utils/prisma.ts`).
- `req.user` is typed via `src/@types/express/index.d.ts` and set by `requireAuth`; `requireRole` guards role-based routes (Prisma `Role` enum).

**Auth**: stateless JWT access tokens; the only server-side auth state is the Redis refresh-token denylist (`services/tokenDenylist.service.ts`) — atomic rotation via `SET NX`, plus a per-user "revoked before" timestamp for revoke-all. OTP flows in `otp.service.ts`.

**Background work**: the API process only *enqueues* jobs (`src/queues`); workers in `src/workers` run as separate processes via `createWorker()` (own Redis connection, logging, graceful shutdown). Adding a worker needs a `worker:<name>` script plus a docker-compose service (copy `email-worker`).

- Maintenance jobs: the maintenance worker registers its own repeatable schedules on boot (`src/queues/maintenance.queue.ts`, handled in `workers/maintenance.worker.ts`); nothing in the API process schedules them.

**Sockets**: `src/sockets/index.ts` attaches Socket.IO and registers namespaces (`notifications.namespace.ts`); the Redis adapter is passed in from `index.ts` for multi-instance fan-out and omitted in tests.

**Config**: all env access goes through `src/config/env.ts` (`ENV`); see `.env.example`. Unit tests load `.env.test` via `src/__tests__/setup.env.ts`.

## Testing notes

- Unit tests (`src/__tests__/unit`) mock/fake Redis (`helpers/fakeRedis.ts`) and need no services.
- E2E tests (`*.e2e.test.ts`) use a real Postgres + Redis from `.env.test`; `setup.e2e.ts` **deletes all users and flushes Redis before every test** — never point it at a database you care about. The email queue is mocked; read OTPs from `enqueueVerificationEmail` mock calls.
