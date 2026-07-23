# Roadmap

Ordered by dependency, not by wishlist. Each phase is shippable on its own, and
each is specced properly before it starts — this document only sketches them.

---

## Phase 1 — Calculator · **MVP, in progress**

Position sizing over an unlimited entry ladder, saved plans, average down/up,
installable offline PWA, no login. Live at `calculator.wahyutrip.com`.

Full spec: [features/calculator.md](features/calculator.md).

**Build order**

1. Monorepo skeleton — pnpm workspace, Turbo, shared tsconfig/eslint, husky.
2. `packages/calc` — **TDD, engine first, no UI.** Ends with the golden test green.
3. `packages/schemas` — zod validation.
4. `packages/ui` — tokens → Tailwind theme, base components, both themes.
5. `apps/web` — calculator screen, ticker picker, result table, summary.
6. Persistence — `PlanRepository` + localStorage, `/portfolio`, `/plan/[id]`.
7. Averaging mode.
8. PWA — manifest, service worker, offline, install prompt.
9. `apps/be` skeleton + Prisma schema + local Postgres.
10. `infra/` + CI/CD → first deploy.

**Exit criteria**: golden case green at 100% branch coverage · Lighthouse mobile
PWA installable and performance ≥ 90 · works in airplane mode after first load ·
verified on a real Android and a real iPhone.

---

## Phase 2 — Accounts

Email and OAuth auth, JWT with refresh rotation, Postgres persistence, user
profile, preference sync.

The critical piece is **migration**: on first login, local plans are lifted to
the server and the local store becomes a cache. Users who have been saving plans
for months must not lose them, and must not be asked to re-enter them. Both
repositories already sit behind `PlanRepository`, so this is a data task rather
than a rewrite.

Gate: a written security spec — session handling, password storage, rate
limiting, PII scope — before implementation, not during.

---

## Phase 3 — Subscriptions

Free / Pro / Premium tiers, Midtrans or Xendit recurring billing, entitlement
middleware, invoices, trials, coupons, dunning.

Gate: entitlement checks enforced server-side. A tier gate that exists only in
the UI is not a gate.

---

## Phase 4 — Stock Picks

Admin CMS for picks (entry, SL, TP, thesis, conviction), scheduled publishing,
tier-gated visibility, push and email notification, and a **historical
performance record including win rate**.

The performance record is the retention engine and it must be honest — published
before the outcome is known, never edited after. A pick history that quietly
drops losers is worth less than no history at all, and users find out.

> **Gate — legal.** Publishing stock picks for a fee in Indonesia touches OJK
> investment-advice territory. This phase needs real legal advice before it
> ships, plus a permanent risk disclaimer. Not a footer added at launch.

---

## Phase 5 — Video & Courses

Mux or Cloudflare Stream with signed playback URLs, course and module structure,
per-lesson progress, tier gating, downloadable materials.

Gate: signed URLs only. Video on public object storage is video that leaks, and
paid content that leaks is the product.

---

## Phase 6 — Analysis

Research notes with rich text and ticker tagging, screener over the existing
sector/board fields, watchlist, fundamental snapshots, and a **licensed**
TradingView charting widget — charts only, never a data source.

---

## Phase 7 — More Tools

Trading journal with equity curve, risk-of-ruin simulator, compounding
projection, dividend calculator, tax report helper, portfolio rebalancer.
Weighted (non-equal) risk distribution across the entry ladder also lands here;
the engine's per-entry loop is already the right seam for it.

Each tool reuses `@mm/calc`. The journal is the highest-value item — it is what
makes the calculator sticky rather than a one-off utility.

---

## Phase 8 — Growth

Landing page and pricing, referral program, community and discussion, and a
React Native app that imports `packages/calc` and `packages/schemas` unchanged.

That the mobile app needs no second engine implementation is the payoff for the
zero-dependency rule held since Phase 1.

---

## Standing principles

- **Nothing skips its spec.** Every phase is written down before it is built.
- **The engine stays pure.** No dependency, ever, in `@mm/calc`.
- **Honest numbers.** Where a figure can be presented flatteringly or accurately,
  it is presented accurately — the planned/actual split in the MVP and the pick
  win rate in Phase 4 are the same commitment.
- **Mobile is the primary target** in every phase, not a port of the desktop one.
