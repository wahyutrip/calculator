# Architecture — System Overview

## The MVP has no backend, on purpose

Every calculation is deterministic arithmetic over numbers the user typed. There
is no market data to fetch, no account to authenticate, no state to reconcile
between devices. A server in this release would add latency, an outage mode, and
an attack surface in exchange for nothing.

```
┌──────────────────────── Browser ────────────────────────┐
│                                                          │
│  apps/web (Next.js, App Router)                          │
│    ├── UI components ────────── @mm/ui (tokens, Radix)   │
│    ├── validation ───────────── @mm/schemas (zod)        │
│    ├── calculation ──────────── @mm/calc (pure, no deps) │
│    └── persistence ──────────── PlanRepository           │
│                                    └── localStorage      │
│                                                          │
│  Service worker ── app shell · static · ticker JSON      │
└──────────────────────────────────────────────────────────┘
                            │
                     (static assets only)
                            ▼
              Caddy → mm-web container on AWS
```

The only network traffic after first load is the service worker checking for a
new build.

## Where the seams are

Three deliberate seams let Phase 2 arrive without a rewrite:

| Seam | MVP implementation | Phase 2 |
|---|---|---|
| `PlanRepository` | `LocalStoragePlanRepository` | `ApiPlanRepository` — no component changes |
| `@mm/schemas` | Validates form input | Same schemas validate API request bodies |
| `@mm/calc` | Imported by the web app | Also imported by the API, and by the Phase 8 React Native app |

`@mm/calc` being pure and dependency-free is what makes the third column
possible. It must not acquire a dependency on React, on a date library, on
`Intl`, or on anything else. Formatting is the UI's job; the engine returns
numbers.

## Rendering

Next.js App Router. The calculator is a **client component** — it is an
interactive tool, not a document, and there is nothing to render on a server
that the client does not immediately re-render.

The shell (layout, top bar, static copy) is server-rendered so first paint is
fast and the page is meaningful before hydration.

`output: 'standalone'` for a small runtime image. No ISR, no server actions, no
route handlers in the MVP.

## Why the backend is scaffolded but not wired

`apps/be` ships in this release with a `/health` endpoint, a Prisma schema
drafted for Phase 2, and a working Docker build — but the web app never calls
it, and `compose.prod.yml` leaves its service commented out.

The reason is that infrastructure discovered late is infrastructure discovered
expensively. Building the image, the compose entry, and the env handling now
means Phase 2 is a data-sync task rather than a simultaneous "learn our own
deploy topology" task. It costs one Dockerfile that is not yet used.

## Data flow, one calculation

```
user types
   └─▶ controlled numeric input (raw number in state, formatted for display)
        └─▶ 300ms debounce
             └─▶ @mm/schemas validate
                  ├─ invalid → inline field errors; last valid result stays, dimmed
                  └─ valid   → @mm/calc calculate()
                                └─▶ CalcResult
                                     ├─ ok: false → typed error surfaced
                                     └─ ok: true  → table + warnings + summary
```

Validation and calculation both run on the client, synchronously, in well under
a frame. There is no loading state anywhere in this flow, and adding one would
be theatre.

## Security posture

The MVP handles no credentials, no PII, and no money movement. The realistic
risks are small and specific:

- **XSS via the share link.** `Bagikan` encodes state into the URL hash and the
  app parses it back. That input is untrusted: it is validated with the same zod
  schemas as form input and never interpolated into markup. A malformed hash
  loads the default state and says so.
- **Dependency supply chain.** `pnpm install --frozen-lockfile` everywhere;
  Dependabot on; no `postinstall` scripts from transitive dependencies.
- **Stale service worker.** Covered in `features/pwa-offline.md`; the highest
  practical severity issue in this release.
- **Phase 2 raises the stakes.** Auth, payments, and PII all arrive together,
  and the security spec for them is written before that phase starts, not
  during it.

No secrets exist in the MVP web app. Anything reaching `NEXT_PUBLIC_*` is public
by definition, and nothing else is referenced client-side.
