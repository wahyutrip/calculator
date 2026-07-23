# Architecture — Tech Stack

Matches `dlhsby/swat/projects/swat/revamp` wherever there is no reason to
differ. Familiar tooling across projects is worth more than a marginally better
library in any one of them.

## Runtime and tooling

| Choice | Version | Why |
|---|---|---|
| Node | ≥ 20 | Matches swat; LTS. |
| pnpm | 9.12.0 | Workspace protocol, strict node_modules, fast CI. Pinned via `packageManager`. |
| Turborepo | ^2.9 | Task graph and caching across packages. |
| TypeScript | ^5.9 | `strict: true`, no exceptions. |
| ESLint 9 + Prettier | flat config | Shared through `@mm/eslint-config`. |
| husky + lint-staged + commitlint | — | Conventional commits, enforced. |

## Web — `apps/web`

| Choice | Why |
|---|---|
| Next.js 16, App Router | Same as swat. Standalone output for a small image. |
| React 19 | — |
| Tailwind CSS v4 | CSS-first config; design tokens become CSS custom properties directly, so there is one source of truth rather than a JS theme object mirrored into CSS. |
| Radix UI primitives | Accessible Select, Dialog, Popover, Tooltip, Switch. Keyboard and focus behaviour we would otherwise reimplement badly. |
| CVA + tailwind-merge | Variant handling, matching the shadcn conventions already used in swat. |
| cmdk | The ticker command palette. |
| react-hook-form + zod resolver | Uncontrolled-by-default forms; the numeric inputs are the controlled exception. |
| lucide-react | Icons. |
| sonner | Toasts. |
| Vitest + Testing Library | Same as swat. |
| Playwright | E2E, plus the offline and PWA assertions. |

**No state library.** The calculator's state is one form plus a repository. Redux
or Zustand here would be ceremony around `useState`.

**No charting library** in the MVP. Nothing is plotted. Recharts arrives with the
Phase 7 equity curve.

**No date library.** Two ISO timestamps and one formatted date do not justify
one.

## Shared packages

| Package | Contents | Dependencies |
|---|---|---|
| `@mm/calc` | Sizing engine, tick sizes, averaging | **none** — enforced |
| `@mm/schemas` | zod schemas shared web ↔ API | `zod` |
| `@mm/ui` | Tokens, base components | React, Radix, CVA |
| `@mm/tsconfig` | Shared tsconfig bases | — |
| `@mm/eslint-config` | Shared flat config | — |

`@mm/calc` having zero dependencies is a hard rule with a lint check behind it.
It is what lets the same tested engine run in the browser, in the Phase 2 API,
and in the Phase 8 React Native app without a second implementation drifting
from the first.

## Backend — `apps/be` (Phase 2, scaffolded now)

| Choice | Why |
|---|---|
| NestJS 11 | Matches swat and sekar. |
| Prisma | Matches swat; typed client, straightforward migrations. |
| PostgreSQL 16 | Local via Docker, AWS RDS in production. |
| zod via `@mm/schemas` | One validation definition shared with the web app. |

## Deployment

| Choice | Why |
|---|---|
| Docker, multi-stage | Same shape as swat's `Dockerfile.web`. |
| AWS EC2, shared dlhsby box | Already running sekar and swat; a third small container is far cheaper than a new instance. |
| Caddy, sekar-owned | Automatic Let's Encrypt. We are a co-tenant via a `conf.d` drop-in. |
| ECR, ap-southeast-3 | Same registry as swat. |
| GitHub Actions | Lint → typecheck → test → build → push → deploy. |

## Deliberately rejected

| Not used | Why not |
|---|---|
| Workbox | The service worker here is a few dozen lines. A build-time SW toolchain is a large dependency for that. |
| next-pwa | Unmaintained against App Router; hides the SW behind config exactly where we need explicit control. |
| A UI kit (MUI, Chakra) | The design is Stockbit-derived and specific. Fighting a kit's opinions costs more than composing Radix. |
| Yahoo/TradingView APIs | See `features/ticker-data.md`. |
| Server-side rendering of results | There is nothing to render that the client does not immediately recompute. |
