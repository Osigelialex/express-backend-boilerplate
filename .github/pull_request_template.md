## What & why

<!-- What does this change do, and why is it needed? -->

## Checklist

- [ ] Tests added/updated (`pnpm test`, `pnpm test:e2e`)
- [ ] `pnpm lint && pnpm typecheck` pass
- [ ] New/changed env vars are in `src/config/env.ts`, `.env.example` (and `.env.test`)
- [ ] Prisma schema change has a committed migration (`pnpm migrate:dev --name ...`)
- [ ] API change is reflected in `postman/` collection and README if user-facing
