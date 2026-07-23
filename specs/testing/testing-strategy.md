# Testing Strategy

TDD is mandatory: failing test → minimal implementation → refactor. When a test
and the implementation disagree, the implementation is fixed — unless the test is
provably wrong, in which case the fix to the test is its own reviewed commit
with the reasoning recorded.

## Where the effort goes

Weighted by consequence, not by convention. A wrong lot number costs a user
money; a misaligned card does not.

| Layer | Target | Gate |
|---|---|---|
| `@mm/calc` unit | **100% branches** | CI blocks below |
| `@mm/schemas` unit | 100% of rules, both directions | CI blocks below 95% |
| `apps/web` component | ≥ 80% | CI blocks below |
| E2E (Playwright) | 5 critical flows | All must pass |
| Lighthouse CI | PWA installable, mobile perf ≥ 90 | CI blocks below |

## `@mm/calc` — the one that matters

**Golden case, locked.** Entries `1000/900/800/700`, SL `600`, risk `1.0%`, fee
`0.4%`, balance `10.000.000` must produce lots `0/0/1/2`, `%m 0.6/0.7/1.0/1.7`,
Rp `0/0/80.000/140.000`, totals `3 lot · 4.0 · 220.000`, planned loss `100.000`.
This test does not change to accommodate a refactor.

**Property tests** (fast-check), because examples cannot cover an unlimited
ladder:

- For any valid input, the output contains no `NaN` and no `Infinity`.
- Total planned risk equals `riskBudget` within floating-point tolerance,
  for any entry count from 1 to 20.
- Lots are monotonic: as an entry price approaches the stop loss, its lot count
  never decreases.
- `lots >= 0` always. A negative lot count is unrepresentable, not merely
  unlikely.
- Actual loss never exceeds planned loss. If it can, the engine is
  over-committing the user's risk budget.
- Truncated `%m` values are always ≤ their exact values.

**Boundaries**: entry exactly one tick above SL · single entry · 20 entries ·
balance at the `100.000` minimum · fee `0%` · TP absent · every tick-band edge
(199/200, 499/500, 1999/2000, 4999/5000).

**Errors**: each `CalcError` variant is reachable and returned, never thrown.

**Averaging**: every branch in `specs/features/averaging.md` §6, especially
`headroom <= 0` blocking and the un-clamped negative `existingRisk` on average
up.

## `apps/web`

Component tests (Vitest + Testing Library) cover behaviour, not implementation —
queried by role and label, never by class name.

`NumericInput` gets disproportionate attention because it is the highest-traffic
component in the product:

- Caret stays put after live thousand-separator formatting.
- Paste of `Rp 10.000.000` / `10,000,000` / `10 000 000` all yield `10000000`.
- Empty is `null`, not `0`.
- Blur snaps to tick and reports it; typing does not.
- Clamping to min/max, with a message.

Also covered: unlimited ladder add/remove/renumber, warnings appearing under
their exact conditions, theme toggle overriding the OS preference in both
directions, and the colour-alone rule (every green/red figure carries a sign or
glyph).

## E2E — the five flows

1. **Calculate.** Enter the golden case → the table shows the exact expected
   values. This is the product working, asserted end to end.
2. **Persist.** Save a plan → hard reload → it is present and reopens identically.
3. **Average down.** Mark a plan filled → average down → blended average and
   headroom-based sizing are correct; the blocked case shows its explanation.
4. **Offline.** Load, go offline, reload → the calculator still computes.
5. **Share.** Copy the share link → open it in a fresh context → identical inputs.

Run on desktop Chromium and a mobile Safari viewport. Accessibility (`axe`)
assertions run on the calculator and portfolio pages, in both themes, at 360px
and 1440px.

## What we do not test

- Third-party library internals.
- Exact pixel positions. Visual regression is deferred; at this size it costs
  more in false failures than it catches.
- Next.js framework behaviour.

## Discipline

- No `test.skip` on `main`. A skipped test is a deleted test that still reports
  green.
- No network in unit or component tests.
- Deterministic: no real clock, no randomness. The engine is pure, so this is
  free — anything needing a fixed date takes it as a parameter.
- Every bug fix starts with a failing test that reproduces it. No exceptions:
  that test is the only proof the bug is actually gone.
