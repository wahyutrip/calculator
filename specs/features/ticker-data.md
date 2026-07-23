# Feature — IDX Ticker Data

Lets the user attach a stock to a plan. Entirely optional — the calculator works
with no ticker selected.

---

## 1. Bundled, not fetched

The full IDX listing ships as a static JSON file in `apps/web/public/data/`.

| Option | Why not |
|---|---|
| Yahoo Finance (`.JK`) | Undocumented, unversioned, rate-limited, and explicitly against their ToS for a commercial product. Breaks without notice. |
| TradingView | No free quote API. The widget ToS forbids extracting data from it. Fine for *charts* later (Phase 6), not as a data source. |
| Google Finance | No API at all. Scraping a Google surface for a paid product is not a foundation. |
| IDX official API | Requires a commercial data agreement. Correct answer eventually; disproportionate for the MVP. |

Bundling gives: zero API keys, zero runtime cost, zero CORS, works offline, no
ToS exposure, and no third party that can take the tool down. The trade is
staleness — a newly listed ticker is missing until we refresh the file.

That trade is right for the MVP because **entry prices are typed by the user**.
They are planned prices, not quotes. Live data would not make a single number in
this tool more correct.

## 2. Shape

```jsonc
// apps/web/public/data/idx-tickers.json
{
  "updatedAt": "2026-07-23",
  "count": 943,
  "tickers": [
    { "code": "BREN", "name": "Barito Renewables Energy Tbk.", "sector": "Utilitas", "board": "Utama" }
  ]
}
```

~60KB raw, ~20KB gzipped. Served as a static asset, precached by the service
worker, and loaded once into memory.

`sector` and `board` are display-only in the MVP; they exist now so the Phase 6
screener does not need a data migration.

## 3. Search

A command palette (`⌘K`, or tapping the search field on touch).

- Matches on **code** and **company name**, case-insensitive, diacritic-folded.
- Exact code match ranks first, then code prefix, then name substring. Typing
  `BR` must put `BREN`/`BRIS` above `Sumber Alfaria` — a fuzzy matcher that
  ignores field priority feels broken on a 4-letter-code market.
- Fuzzy matching is subsequence-based with a rank penalty for gaps, so `brn`
  still finds `BREN` but never outranks a prefix hit.
- Up to 8 results. Recents (last 5, from `mm:prefs:v1`) show on an empty query.
- Full keyboard operation: ↑/↓, Enter, Esc. On touch, results are ≥44px tall.
- No match → *"Ticker tidak ditemukan. Anda tetap bisa menghitung tanpa memilih
  saham."* The dead end always offers the way forward.

Search runs against the in-memory array — under 1000 entries, no index is
warranted and adding one is premature.

## 4. Refresh

`scripts/refresh-tickers.ts`, run manually:

```bash
pnpm tickers:refresh          # writes apps/web/public/data/idx-tickers.json
pnpm tickers:refresh --dry-run  # prints the diff, writes nothing
```

The script prints added/removed/renamed tickers and requires the diff to be
committed. This is deliberate: a data file that changes under CI without review
means a delisting can silently break a saved plan. Refresh quarterly, or when a
user reports a missing ticker.

Delisted tickers are **kept** in the file, flagged `"delisted": true`, and hidden
from search but still resolvable — otherwise a saved plan referencing one would
render with a blank stock name.

## 5. Tests

- Exact code match outranks prefix, which outranks name substring.
- Lowercase, mixed case, and whitespace-padded queries all match.
- Empty query returns recents, not the whole list.
- A ticker absent from the file still renders its saved plan (graceful degrade).
- The JSON validates against its zod schema at build time — a malformed refresh
  fails the build, not the browser.
