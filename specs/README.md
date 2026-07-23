# Specs

Source of truth for what we are building and why. Written before the code; kept
in step with it afterwards.

## Read in this order

| # | Document | What it answers |
|---|---|---|
| 1 | [product-brief.md](product-brief.md) | What the product is, who it is for, what the MVP deliberately excludes |
| 2 | [roadmap.md](roadmap.md) | The eight phases and what gates each one |
| 3 | [architecture/system-overview.md](architecture/system-overview.md) | How the pieces fit; why the MVP has no backend |
| 4 | [architecture/tech-stack.md](architecture/tech-stack.md) | Every dependency and the reason it is there |
| 5 | [architecture/repo-structure.md](architecture/repo-structure.md) | Where code goes and what may import what |

## Features

| Document | Scope |
|---|---|
| [features/calculator.md](features/calculator.md) | **The core.** Sizing algorithm, entry ladder, validation, number formatting |
| [features/portfolio-plans.md](features/portfolio-plans.md) | Saving, listing, and restoring plans; the storage contract |
| [features/averaging.md](features/averaging.md) | Average down and average up against a held position |
| [features/ticker-data.md](features/ticker-data.md) | The bundled IDX list, why it is bundled, how it is refreshed |
| [features/pwa-offline.md](features/pwa-offline.md) | Installability, the service worker, update handling |

## Design

| Document | Scope |
|---|---|
| [design-system/design-tokens.md](design-system/design-tokens.md) | Colour, type, space, radius — and the rules that govern them |
| [design-system/tokens.json](design-system/tokens.json) | Machine-readable token source |
| [design-system/components.md](design-system/components.md) | Component inventory and behaviour |
| [design-system/responsive.md](design-system/responsive.md) | Breakpoints and how each screen reflows |

## Delivery

| Document | Scope |
|---|---|
| [testing/testing-strategy.md](testing/testing-strategy.md) | What we test, at which level, and the coverage gates |
| [deployment/README.md](deployment/README.md) | Deployment index |
| [deployment/local-development.md](deployment/local-development.md) | Getting it running on your machine |
| [deployment/infrastructure.md](deployment/infrastructure.md) | The AWS box, the shared Caddy, the co-tenancy rules |
| [deployment/ci-cd.md](deployment/ci-cd.md) | The pipeline, gates, and rollback |
| [deployment/environment-variables.md](deployment/environment-variables.md) | Every variable, per environment |

## Conventions used throughout

- **MUST / SHOULD / MAY** carry their RFC 2119 meanings.
- Anything marked **Phase 2+** is explicitly out of MVP scope. Do not build it.
- Code identifiers are English; user-facing copy is Indonesian. Both appear in
  these specs — the Indonesian strings are the literal shipping copy, not
  glosses.
- Money is IDR. Prices are whole rupiah. `1 lot = 100 lembar`.
