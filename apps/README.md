# apps/

| App | Package | Status | Purpose |
|---|---|---|---|
| [`web/`](web/) | `@mm/web` | **MVP** | The product. Next.js PWA at `calculator.wahyutrip.com`. |
| [`be/`](be/) | `@mm/be` | Skeleton | NestJS API. Built and dockerised now; carries no traffic until Phase 2. |

Shared code lives in [`../packages/`](../packages/) — `@mm/calc` (engine),
`@mm/schemas` (validation), `@mm/ui` (design system).

## Import direction

```
apps/web  →  @mm/ui, @mm/schemas, @mm/calc      ✓
apps/be   →  @mm/schemas, @mm/calc              ✓
apps/web  →  apps/be                            ✗   never
packages  →  apps                               ✗   never upward
@mm/calc  →  anything                           ✗   zero dependencies
```

Enforced by ESLint, not by convention. See
[`../specs/architecture/repo-structure.md`](../specs/architecture/repo-structure.md).

## Running

```bash
./scripts/setup.sh              # once — web only, no Docker needed
./scripts/start.sh              # web on :4220
./scripts/start.sh --with-be    # web :4220 + API :4210 + Postgres
```
