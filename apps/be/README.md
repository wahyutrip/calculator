# @mm/be

NestJS 11 + Prisma + PostgreSQL. **Skeleton — Phase 2.**

In the MVP this service exposes only `/health`. The web app never calls it, and
its service in `infra/compose.prod.yml` is commented out. It is built in CI and
dockerised now so that Phase 2 is a feature task rather than a simultaneous
"discover our own deploy topology" task — a Dockerfile that has never been built
is a Dockerfile that does not work.

Dev: `http://localhost:3100`

```bash
./scripts/setup.sh --with-be    # Postgres + migrations
./scripts/start-be.sh
```

## MVP surface

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness. Returns `{ status, uptime, version }`. |
| `GET /health/ready` | Readiness — includes a database ping. |

## Layout

```
src/
├─ main.ts                 bootstrap, CORS, global pipes
├─ app.module.ts
├─ config/                 zod-validated env, fails loudly at boot
├─ common/                 filters, interceptors, guards
├─ health/                 the MVP surface
└─ modules/                Phase 2 features land here
prisma/
├─ schema.prisma
└─ migrations/
```

## Prisma schema — drafted for Phase 2

Not migrated in the MVP; written now so the shape is agreed before it is urgent.

| Model | Notes |
|---|---|
| `User` | email, hashed password, OAuth identities, timestamps |
| `Subscription` | tier, status, period, gateway reference |
| `Plan` | mirrors `SavedPlan` — **inputs only**, never computed results |
| `PlanEntry` | one row per ladder rung; unlimited, ordered |
| `Position` | a filled position: lots + average price |
| `StockPick` | Phase 4 — entry, SL, TP, thesis, publish window, tier |

`Plan` storing inputs only matches the client contract in
`specs/features/portfolio-plans.md`. Persisting derived figures would let stored
numbers drift from the engine after any fix.

## Rules

- **Never reimplement the calculation.** Import `@mm/calc`. Two implementations
  drift, and the drift shows up as a user's plan changing when they log in.
- **Never redefine validation.** Import `@mm/schemas` — the same schemas the web
  app uses.
- Config is zod-validated at boot; a missing variable crashes with its name, it
  does not fall back to a default.
- `CORS_ORIGIN` is an explicit allow-list. Never `*` once auth exists.
- Parameterised queries only — Prisma handles this, and raw SQL needs a reason.
- No secrets in the repo. Phase 2 secrets come from SSM Parameter Store, the
  pattern sekar and swat already use.

## Scripts

```bash
pnpm dev · build · start
pnpm prisma:generate · prisma:migrate · prisma:deploy · prisma:studio
pnpm test · test:cov · lint · typecheck
```

## Specs

[system overview](../../specs/architecture/system-overview.md) ·
[tech stack](../../specs/architecture/tech-stack.md) ·
[env vars](../../specs/deployment/environment-variables.md) ·
[roadmap Phase 2](../../specs/roadmap.md)
