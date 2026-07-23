# Money Management — Lot Sizing Calculator

Position sizing and money management for IDX traders. Given your capital, your
risk tolerance, and your planned entry ladder: exactly how many lots to buy at
each level.

`https://calculator.wahyutrip.com` — no login, installable, works offline.

This is release one of a larger trading platform. See
[`specs/product-brief.md`](specs/product-brief.md) for why it starts here, and
[`specs/roadmap.md`](specs/roadmap.md) for what follows.

## Quick start

```bash
./scripts/setup.sh     # once — no Docker, no database needed
./scripts/start.sh     # http://localhost:4220 (see specs for ports)
```

Node ≥ 20 and pnpm 9.12.0 (`corepack enable`).

## Layout

```
apps/web        the product — Next.js PWA
apps/be         NestJS API — skeleton, Phase 2
packages/calc   the sizing engine (zero dependencies, 100% branch coverage)
packages/schemas  zod schemas shared web ↔ API
packages/ui     design tokens + components
infra/          Dockerfiles, compose, Caddy drop-in
scripts/        setup.sh, start.sh, infra.sh
specs/          what we are building and why — read this first
```

## What it does

- Unlimited entry ladder — Buy 1, Buy 2, Buy 3, …
- Risk as a percentage of capital, with the familiar named presets.
- Broker fees including the sell-side PPh, folded into the profit estimate.
- **Planned and Actual side by side.** Whole-lot rounding usually means the risk
  you actually take is a fraction of the risk you configured. Showing that gap
  is the main thing this tool does that a spreadsheet does not.
- Saved plans, average down and average up against a position you hold.
- Installs to the home screen; every calculation is local, so it works offline.

## Docs

| | |
|---|---|
| [specs/](specs/) | Product, architecture, features, design, deployment |
| [specs/features/calculator.md](specs/features/calculator.md) | The algorithm, validation, formatting |
| [specs/deployment/local-development.md](specs/deployment/local-development.md) | Getting it running |
| [specs/deployment/infrastructure.md](specs/deployment/infrastructure.md) | AWS, the shared Caddy, co-tenancy rules |
| [scripts/README.md](scripts/README.md) | Every script |
| [infra/README.md](infra/README.md) | Docker and deploy mechanics |

## Non-negotiables

- `@mm/calc` has **zero dependencies** and 100% branch coverage. The whole
  product is this arithmetic being right.
- TDD: failing test, then implementation.
- Mobile-first. Designed at 360px, verified on real devices.
- Indonesian UI copy, English code identifiers, `id-ID` number formatting
  throughout.
