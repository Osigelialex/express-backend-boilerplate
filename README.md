# Backend Boilerplate

Production-ready backend starter built with **Express**, **TypeScript**, **Prisma (PostgreSQL)**, **Redis**, **BullMQ** and **Socket.IO**.

## Features

- JWT auth with refresh-token rotation and a Redis-backed denylist (revoke one or all sessions)
- Email verification, password reset and OTP flows
- Role-based access control (`requireAuth`, `requireRole`)
- Zod request validation via DTOs
- Consistent API response envelope and typed error handling
- Pagination/filter pattern for list endpoints
- Background jobs with BullMQ (email and maintenance workers run as separate processes)
- Socket.IO with a Redis adapter for multi-instance fan-out
- Rate limiting, Helmet, CORS, compression, request IDs, structured logging (Winston)
- Health and readiness probes
- Unit and end-to-end tests (Jest + Supertest), ESLint, Prettier, GitHub Actions CI
- Docker and docker-compose setups for dev and production

## Requirements

- Node.js >= 20
- [pnpm](https://pnpm.io/)
- PostgreSQL 16 and Redis (or just Docker)

## Getting started

```bash
pnpm install
cp .env.example .env      # fill in secrets; every variable is validated at boot
pnpm generate             # generate the Prisma client
pnpm migrate:dev          # create/apply migrations
pnpm seed:dev             # create the initial admin user
pnpm dev                  # start the API with hot reload
```

Run the workers in separate terminals:

```bash
pnpm worker:email:dev
pnpm worker:maintenance:dev
```

Or run the whole stack (API, workers, Postgres, Redis, Mailpit) with Docker:

```bash
pnpm docker:dev
```

The API listens on `http://localhost:4000` by default. In development with Docker, Mailpit shows outgoing mail at `http://localhost:8025`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the API with nodemon + tsx |
| `pnpm build` / `pnpm start` | Compile to `dist/` and run the build |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` | Unit tests (no Postgres/Redis needed) |
| `pnpm test:coverage` | Unit tests with coverage |
| `pnpm test:e2e` | Migrate the test DB and run e2e tests |
| `pnpm migrate:dev` / `pnpm migrate` | Create dev migration / deploy migrations |
| `pnpm studio` | Prisma Studio |
| `pnpm seed:dev` / `pnpm seed:prod` | Seed the initial admin |
| `pnpm worker:email[:dev]` | Email worker |
| `pnpm worker:maintenance[:dev]` | Maintenance worker |
| `pnpm docker:dev[:build\|:down]` | Dev docker-compose stack |

## API

All routes are mounted under `/v1`. Health probes (`/health`, `/ready`) are outside rate limiting.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/v1/auth/signup` | – | Register |
| POST | `/v1/auth/login` | – | Log in |
| POST | `/v1/auth/refresh` | – | Rotate refresh token |
| POST | `/v1/auth/logout` | – | Revoke refresh token |
| POST | `/v1/auth/verify-email` | – | Verify email with code |
| POST | `/v1/auth/send-email-verification` | – | Resend verification code |
| POST | `/v1/auth/forgot-password` | – | Request password reset |
| POST | `/v1/auth/reset-password` | – | Reset password with code |
| GET | `/v1/users/me` | User | Current user |
| PATCH | `/v1/users/me` | User | Update profile |
| POST | `/v1/admin/admins` | Admin | Create an admin |
| GET | `/v1/admin/users` | Admin | List users (paginated, filtered) |
| DELETE | `/v1/admin/users/:id` | Admin | Delete a user |

A Postman collection lives in [`postman/`](postman).

## Project structure

```
src/
  app.ts          Express app (middleware + routes); no listening
  index.ts        HTTP server, Socket.IO, graceful shutdown
  config/         env validation (ENV) and constants
  routes/         Route definitions; v1/index.ts mounts features
  controllers/    Thin HTTP layer (one service call each)
  services/       Business logic and Prisma access
  dtos/           Zod schemas for request validation
  middleware/     Auth, validation, rate limiting, error handler
  queues/         BullMQ producers
  workers/        BullMQ consumers (separate processes)
  sockets/        Socket.IO namespaces
  utils/          AppError, error codes, pagination, helpers
prisma/           Schema and migrations
scripts/          Seed scripts
```

### Adding a feature

1. Add a DTO in `src/dtos`, a service, a controller and a `*.routes.ts` file.
2. Mount it in `src/routes/v1/index.ts`: `v1Router.use("/<feature>", featureRoutes);`
3. Throw `AppError` subclasses for failures; controllers extend `BaseController.handleRequest`.

## Configuration

Copy `.env.example` to `.env`. The app refuses to start if a variable is missing or invalid (see `src/config/env.ts`). Key groups: server/CORS, `DATABASE_URL`, `REDIS_URL`, JWT/refresh/action-token secrets, SMTP, and seed admin credentials.

## Testing

- **Unit tests** (`src/__tests__/unit`) use a fake Redis and require no services.
- **E2E tests** (`*.e2e.test.ts`) need Postgres and Redis configured in `.env.test`. They delete all users and flush Redis before every test, so never point them at a database you care about.

## Deployment

Build the image with the provided `Dockerfile` and run `docker-compose.yml` (API plus workers). Run `pnpm migrate` against the production database before starting, and `pnpm seed:prod` once to create the initial admin.

## License

[MIT](LICENSE)
