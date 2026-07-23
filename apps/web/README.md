# @mm/web

The product: an installable, offline-capable lot-sizing calculator for IDX
traders. Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript strict.

Production: `https://calculator.wahyutrip.com` · Dev: `http://localhost:4220`

```bash
./scripts/start-web.sh          # foreground
./scripts/start-web.sh --https  # TLS — required to test the PWA on a phone
```

## Routes

| Route | Rendering | Purpose |
|---|---|---|
| `/` | Shell SSR, calculator client | The calculator. Also handles `#plan=` share links. |
| `/portfolio` | Client | Saved plans. |
| `/plan/[id]` | Client | A saved plan reopened. |

There are no API routes and no server actions. The app makes no network calls
after first load.

## Layout

```
src/
├─ app/            routes, layout, metadata
├─ components/
│  ├─ calculator/  EntryLadder · ParameterFields · ResultTable · ResultCards
│  │               SummaryPanel · WarningList · AveragingPanel
│  ├─ ticker/      TickerPicker (cmdk)
│  ├─ layout/      TopBar · ThemeToggle · InstallButton · OfflineBadge
│  └─ pwa/         UpdateToast · register-sw
├─ hooks/          useCalculator · usePlans · useDebounce · useMediaQuery
├─ lib/
│  ├─ storage/     PlanRepository + LocalStoragePlanRepository
│  ├─ format/      id-ID formatters + the caret-preserving numeric mask
│  └─ share/       URL-hash encode/decode
└─ types/
public/
├─ manifest.webmanifest
├─ sw.js                    hand-written service worker
├─ icons/                   192 · 512 · maskable-512
└─ data/idx-tickers.json    bundled IDX listing
```

## Rules specific to this app

- **Never calculate here.** All arithmetic lives in `@mm/calc`. A formula in a
  component is a formula that is not covered by the engine's 100% branch gate.
- **Never validate here.** Schemas come from `@mm/schemas`, shared with the API.
- **Never hardcode a colour.** Components reference CSS custom properties; a hex
  in a component file cannot follow the theme.
- **Formatted display, raw state.** Components hold `number`, format for
  display, and never parse a formatted string back into state.
- **`tabular-nums` on every figure**, without exception.
- **Storage only through `PlanRepository`.** No component touches
  `localStorage` directly — that interface is what makes Phase 2 a swap.

## Scripts

```bash
pnpm dev            # next dev on WEB_PORT
pnpm dev:https      # next dev --experimental-https (PWA testing on a phone)
pnpm build          # standalone output
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm lint · typecheck
```

## Gotchas

- **PWA needs a secure origin.** `http://localhost` qualifies;
  `http://192.168.x.x` does not. Without `--https` the service worker silently
  never registers on a phone, with nothing in the console to explain it.
- **`public/` is not traced into standalone output.** `infra/Dockerfile.web`
  copies it explicitly. Losing that copy breaks installability while leaving the
  app looking perfectly healthy.
- **`NEXT_PUBLIC_*` is baked at build time.** Changing the app URL needs a
  rebuild, not a restart.
- **Shared packages are imported as built `dist/`.** Run their `dev` script, or
  rebuild, when changing them.

## Specs

[calculator](../../specs/features/calculator.md) ·
[plans](../../specs/features/portfolio-plans.md) ·
[averaging](../../specs/features/averaging.md) ·
[PWA](../../specs/features/pwa-offline.md) ·
[tickers](../../specs/features/ticker-data.md) ·
[tokens](../../specs/design-system/design-tokens.md) ·
[components](../../specs/design-system/components.md) ·
[responsive](../../specs/design-system/responsive.md)
