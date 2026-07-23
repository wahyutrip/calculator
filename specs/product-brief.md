# Product Brief

## The platform

A subscription platform for Indonesian retail stock traders. Members get stock
picks, written analysis, video courses, and a suite of trading tools —
positioned in the same space as Neobdm and Stockbit.

## Why the first release is a calculator

Building the whole platform before anything reaches a user is the expensive way
to find out whether anyone wants it. So release one is the single tool with the
clearest standalone value and the fewest dependencies:

> Given my capital, my risk tolerance, and my planned entry ladder — exactly how
> many lots do I buy at each level?

It ships at `calculator.wahyutrip.com` with **no login**. Anyone can land on it
and use it immediately. That makes it three things at once:

1. A genuinely useful tool that stands on its own.
2. A top-of-funnel acquisition asset for the paid platform. Traders share
   calculators; they do not share signup pages.
3. A proving ground for the monorepo, the design system, and the deploy pipeline
   — all of which the full platform inherits.

## Who it is for

Indonesian retail traders on IDX who already think in terms of risk per trade
and staged entries. They know what a stop loss is and what `1%m` means. The tool
does not teach position sizing; it removes the arithmetic and the mistakes.

Concretely, the user is someone who currently does this in a spreadsheet, or in
a competing web tool, and wants it faster and on their phone.

## What the MVP is

- Position sizing across an **unlimited** entry ladder (Buy 1, Buy 2, Buy 3, …).
- Risk expressed as a percentage of capital, with named presets.
- Broker fees, including the sell-side tax, folded into the profit estimate.
- Both the **planned** (ideal, fractional) and **actual** (whole-lot) outcome,
  because the gap between them is the tool's most useful output.
- Saved plans in the browser, with average-down and average-up planning against
  a position already held.
- An installable, offline-capable PWA. Mobile is the primary target.

## What the MVP is not

Explicitly excluded, and not to be built until its phase arrives:

- No accounts, no login, no server-side persistence.
- No live prices. Entry prices are *planned* prices the user types; they are not
  quotes, and a quote would not make the tool more correct.
- No landing page, no pricing page, no payments.
- No stock picks, no content, no charts.

## What success looks like

The MVP has done its job if a trader can go from opening the page to a correct
lot plan in under 30 seconds on a phone, and installs it to their home screen
rather than bookmarking it.

Concrete gates before Phase 2 starts:

- The calculation engine reproduces a known-good reference case exactly, with
  100% branch coverage.
- Lighthouse mobile: installable PWA, performance ≥ 90.
- The tool works with the phone in airplane mode after first load.

## Constraints that shape the design

- **Mobile-first, genuinely.** The reference tool is a desktop layout with a
  five-column table. On a 360px phone that table is unreadable, so it reflows to
  stacked cards rather than scrolling sideways.
- **IDX market rules are not optional.** One lot is 100 shares, prices move in
  tick sizes that depend on the price band, and a plan that ignores either is
  not executable.
- **Offline is a feature, not a nicety.** Trading floors, commuter trains, and
  Indonesian mobile data are all unreliable. Every calculation is local, so
  there is no reason for the tool to need a network — and it must not.
- **The engine outlives the UI.** `packages/calc` is pure, dependency-free, and
  framework-agnostic so that the Phase 8 React Native app and any future
  server-side use import the same tested code rather than a second
  implementation that drifts.

## Known risk, flagged early

Publishing stock picks for a fee in Indonesia touches OJK investment-advice
territory. That is a Phase 4 concern, not an MVP one, but it needs real legal
advice **before** that phase ships rather than a disclaimer added at launch. A
calculator gives no advice and is not affected.
