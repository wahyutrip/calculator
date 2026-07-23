# Architecture — Repo Structure

```
money-management/
├─ apps/
│  ├─ web/                  Next.js PWA — the product
│  └─ be/                   NestJS API — skeleton, Phase 2
├─ packages/
│  ├─ calc/                 sizing engine (zero dependencies)
│  ├─ schemas/              zod schemas shared web ↔ API
│  ├─ ui/                   design tokens + base components
│  ├─ tsconfig/             shared tsconfig bases
│  └─ eslint-config/        shared flat ESLint config
├─ infra/                   Dockerfiles, compose, Caddy drop-in
├─ scripts/                 setup.sh, start.sh, infra.sh, lib/common.sh
├─ specs/                   this documentation
├─ logs/                    dev PID files + logs (gitignored)
├─ package.json  pnpm-workspace.yaml  turbo.json  .npmrc
└─ tsconfig.base.json  eslint.config.mjs  .commitlintrc.cjs  .husky/
```

## Import rules

Enforced by ESLint (`no-restricted-imports`), not by convention:

```
apps/web  →  @mm/ui, @mm/schemas, @mm/calc     ✓
apps/be   →  @mm/schemas, @mm/calc             ✓
@mm/ui    →  @mm/calc                          ✗  UI must not calculate
@mm/calc  →  anything at all                   ✗  zero dependencies
@mm/*     →  apps/*                            ✗  never upward
apps/web  →  apps/be                           ✗  no direct app coupling
```

`@mm/calc` importing nothing — not React, not zod, not `Intl` — is the rule that
makes it reusable in the Phase 2 API and the Phase 8 mobile app. Breaking it is
not a style violation; it forecloses those.

## `apps/web` internals

```
apps/web/src/
├─ app/
│  ├─ layout.tsx            shell, theme provider, metadata
│  ├─ page.tsx              calculator
│  ├─ portfolio/page.tsx
│  └─ plan/[id]/page.tsx
├─ components/
│  ├─ calculator/           EntryLadder, ParameterFields, ResultTable,
│  │                        SummaryPanel, WarningList, AveragingPanel
│  ├─ ticker/               TickerPicker (cmdk)
│  ├─ layout/               TopBar, ThemeToggle, InstallButton, OfflineBadge
│  └─ pwa/                  UpdateToast, register-sw
├─ hooks/                   useCalculator, usePlans, useDebounce, useMediaQuery
├─ lib/
│  ├─ storage/              PlanRepository + LocalStoragePlanRepository
│  ├─ format/               id-ID formatters, the caret-preserving mask
│  └─ share/                URL-hash encode/decode
└─ types/
```

One component per file, one concern per component. Files stay under 300 lines;
`ResultTable` is the one most likely to drift past that — its mobile card layout
belongs in a sibling `ResultCards`, not in a branch inside it.

## `packages/calc` internals

```
packages/calc/src/
├─ index.ts        public surface — the only file other packages import from
├─ constants.ts    LOT_SIZE, limits, presets
├─ tick.ts         tickSize(), snapToTick()
├─ size.ts         calculate() — the core loop
├─ average.ts      averageDown() / averageUp()
├─ summary.ts      planned vs actual, profit, risk:reward
├─ warnings.ts     the warning rules from features/calculator.md §3.3
├─ errors.ts       CalcError union
└─ types.ts
```

Every file has a sibling `__tests__/*.test.ts`. Coverage gate: **100% branches**
for this package, enforced in CI. Not aspirational — the whole product is this
arithmetic being right.

## Naming

- Packages `@mm/*`. Containers `mm-*`. Storage keys `mm:*:v1`.
- Files kebab-case; React components PascalCase in PascalCase files.
- Code identifiers English; user-facing strings Indonesian.
- Branches `feat/`, `fix/`, `chore/`; commits Conventional, enforced by
  commitlint.
