# Feature — Lot Sizing Calculator

The core of the MVP. Everything else in the release exists to serve this screen.

Route: `/` · Package: `@mm/calc` (engine) + `apps/web` (UI) · Auth: none

---

## 1. Market rules

Non-negotiable IDX constraints. The engine encodes them; the UI enforces them.

| Rule | Value |
|---|---|
| Lot size | **100 lembar** (`LOT_SIZE = 100`) |
| Currency | IDR, whole rupiah — no sub-rupiah prices |
| Tick size (fraksi harga) | see below |

```ts
// packages/calc/src/tick.ts
export function tickSize(price: number): number {
  if (price < 200)  return 1;
  if (price < 500)  return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
}
```

Prices MUST snap to their tick. Snapping happens **on blur**, never on
keystroke — snapping mid-typing makes the field fight the user (typing `1` in an
empty field would instantly become something else).

The band is chosen by the price being snapped, and a naive `round(p / tick) *
tick` can land the result in a *different* band (e.g. 498 → tick 2 → 498 ✓, but
1998 → tick 5 → 2000, which belongs to the tick-10 band and happens to be
valid). Rounding **down** to the band boundary is not correct either. The rule:
snap within the band the raw price falls in, then re-validate; 2000 is a legal
tick-10 price, so the result stands. Unit tests MUST cover every band boundary
(199/200, 499/500, 1999/2000, 4999/5000).

Auto-Rejection limits (ARA/ARB) are **not** enforced in the MVP.

---

## 2. Inputs

```ts
interface PlanInput {
  ticker: string | null;   // optional — the calculator works with no ticker
  entries: number[];       // 1..N planned buy prices, tick-aligned, > stopLoss
  stopLoss: number;        // tick-aligned, < min(entries)
  riskPercent: number;     // 0.1 .. 10, percent of balance
  buyFeePercent: number;   // 0 .. 1
  sellFeePercent: number;  // 0 .. 1.5, defaults to buyFee + 0.1 (PPh final)
  balance: number;         // whole rupiah, >= 100_000
  takeProfit?: number;     // optional, > max(entries)
  existing?: ExistingPosition;  // averaging mode — see features/averaging.md
}
```

### 2.1 The entry ladder — unlimited

The reference tool caps entries at four. We do not.

- Rows are labelled **Buy 1, Buy 2, Buy 3, …** in sequence, renumbering
  immediately when a row is removed. (Indonesian UI: `Beli 1`, `Beli 2`, …)
- Default state: **4 rows**, matching the habit most users arrive with.
- Minimum 1 row. The remove control is hidden, not disabled, on the last row.
- **Soft cap 20 rows.** Beyond that the "Tambah entry" button disables with the
  reason shown: *"Maksimal 20 entry. Ladder yang lebih panjang tidak menambah
  presisi — risiko per entry sudah di bawah 1 lot."* This is not an arbitrary
  limit: risk is split equally, so at 20 entries each level receives 5% of the
  risk budget, and on any realistic balance that rounds to zero lots. A cap that
  explains itself beats a scroll of empty rows.
- Rows are reorderable by drag on desktop and by ▲/▼ buttons on touch. Order is
  cosmetic — the engine sorts internally — but users think in ladder order and a
  jumbled list reads as a bug.
- Empty rows are **ignored**, not rejected. A user who clears Buy 3 while
  keeping Buy 4 gets a 3-entry plan, not an error.

### 2.2 Risk presets

`%m` = percent of modal. Values are exactly those of the reference tool.

| Value | Label | | Value | Label |
|---|---|---|---|---|
| 0.5 | Defensive | | 3.0 | Medium Risk |
| **1.0** | **Standard** (default) | | 3.5 | High Risk |
| 1.5 | Optimistic | | 4.0 | Extreme Risk |
| 2.0 | Aggresive | | 4.5 | Gamble |
| 2.5 | Risky | | 5.0 | Dangerous |

Plus **Custom**, accepting `0.1 – 10.0`. Selecting Custom reveals a number
input; it does not replace the select.

Rendered as `[1.0%m] Standard`. The label spelling `Aggresive` matches the
reference tool. It is misspelled. We match it anyway — users recognise the
string, and silently "fixing" it makes our preset look like a different option
from the one they know.

### 2.3 Fee presets

Buy fee: `0%` · `0.2%` · `0.3%` · `0.33%` · `0.36%` · **`0.4%` (default)** ·
`0.44%` · `0.46%` · `0.48%` · `0.5%` · Custom `0 – 1`.

Sell fee lives in a collapsed **"Pengaturan lanjutan"** disclosure and defaults
to `buyFee + 0.1%` — the 0.1% PPh final on IDX sale proceeds. It recomputes with
the buy fee until the user edits it, after which it is theirs and stops
following. (A field that keeps overwriting an explicit edit is worse than one
that never updates.)

Sell fee affects **profit estimation only**. It never changes lot sizing,
because the sizing decision is made at buy time.

### 2.4 Balance

A plain rupiah amount — **not** a value in millions.

- Field label: `Balance` with the helper `(modal, bukan equity)`.
- Input is a whole number with live thousand separators: `10.000.000`.
- Minimum `100.000`. Below that no realistic IDX plan yields a single lot, and
  accepting it produces an all-zero table that looks broken.
- Quick-add chips below the field — `+1jt`, `+10jt`, `+100jt` — add to the
  current value rather than replacing it. They are a convenience for the common
  round figures; they are not a unit system, and the field always holds and
  displays whole rupiah.

---

## 3. The algorithm

Verified against the reference tool. `packages/calc/src/size.ts`.

```
riskBudget    = balance × riskPercent / 100
riskPerEntry  = riskBudget / entries.length        // equal split across the ladder

for each entry:
  sharesPlanned = riskPerEntry / (entry − stopLoss)
  valuePlanned  = sharesPlanned × entry
  pctOfModal    = trunc1(valuePlanned / balance × 100)   // the "%m" column
  lots          = floor(sharesPlanned / 100)
  sharesActual  = lots × 100
  valueActual   = sharesActual × entry
```

`trunc1` truncates toward zero at one decimal — `0.625 → 0.6`, `1.75 → 1.7`. Not
rounding. The total `%m` is the **sum of the truncated row values**, not the
truncation of the true sum: `0.6 + 0.7 + 1.0 + 1.7 = 4.0`, where the exact sum is
`4.125`. This reproduces the reference tool, and a column that does not add up to
its own total reads as a bug to the user.

### 3.1 Golden case

Entries `1000, 900, 800, 700` · SL `600` · Risk `1.0%` · Fee `0.4%` · Balance
`10.000.000`.

| Entry | riskPerEntry | sharesPlanned | %m | Lot | Rp |
|---:|---:|---:|---:|---:|---:|
| 1.000 | 25.000 | 62,5 | 0,6 | 0 | 0 |
| 900 | 25.000 | 83,33 | 0,7 | 0 | 0 |
| 800 | 25.000 | 125,0 | 1,0 | 1 | 80.000 |
| 700 | 25.000 | 250,0 | 1,7 | 2 | 140.000 |
| **Total** | | | **4,0** | **3** | **220.000** |

This case is a locked test in `packages/calc`. It MUST NOT be changed to
accommodate a refactor.

### 3.2 Summary — Planned and Actual, both shown

| Metric | Planned (fractional ideal) | Actual (whole lots) |
|---|---|---|
| Estimated average | `Σ valuePlanned / Σ sharesPlanned` → **792,0** | `Σ valueActual / Σ sharesActual` → **733,3** |
| Total modal | 412.500 | 220.000 |
| Loss @ SL | `riskBudget` → **100.000** (1,0%) | `Σ sharesActual × (entry − SL)` → **40.000** (0,4%) |
| Profit @ TP | fee-adjusted | fee-adjusted |
| Risk : reward | `profit / loss` | `profit / loss` |

```
grossBuy  = Σ value × (1 + buyFee)
netSell   = Σ shares × TP × (1 − sellFee)
estProfit = netSell − grossBuy
```

**Actual is visually primary** — it is what the user will really buy. Planned sits
beside it, muted, as the reference figure.

The reference tool shows only the planned numbers. That hides the whole-lot
rounding gap, which on the golden case means the user believes they are risking
1% when they are risking 0,4%. Surfacing that gap is the single most valuable
thing this tool does that the reference does not.

> **Open question for the owner.** The reference tool reports Estimated Average
> `792,7` on the golden case. Planned gives `792,0`, fee-adjusted sizing gives
> `793,4`; neither matches exactly and the reference's convention is not
> documented. We ship `792,0` / `733,3`, both derived from stated formulas. If an
> exact match to `792,7` is required, that is a spec change, not a bug fix.

### 3.3 Warnings

Computed alongside the result, rendered between the table and the summary.

| Condition | Severity | Copy |
|---|---|---|
| `actualLoss < riskBudget × 0.5` | warning | *Pembulatan lot membuat risiko riil hanya Rp X dari anggaran Rp Y. Pertimbangkan menaikkan balance atau mengurangi jumlah entry.* |
| `Σ valuePlanned > balance` | warning | *Rencana ini butuh Rp X, melebihi modal Rp Y. Jika semua entry terisi, Anda kekurangan dana.* |
| every row `lots === 0` | warning | *Tidak ada entry yang mencapai 1 lot. Modal terlalu kecil untuk rentang harga ini, atau SL terlalu jauh.* |
| `entries.length > 8` | info | *Risiko dibagi rata ke {n} entry, jadi tiap level dapat {x}% dari anggaran risiko.* |

The over-allocation warning matters far more with an unlimited ladder than it
did at four rows: entries far above the stop loss each demand a large position
for the same risk, so a long ladder can easily plan more capital than exists.

### 3.4 Guarantees

The engine MUST NOT throw. Invalid input returns a typed result:

```ts
type CalcResult =
  | { ok: true;  data: PlanOutput }
  | { ok: false; error: CalcError };  // 'SL_NOT_BELOW_ENTRY' | 'BALANCE_TOO_SMALL' | ...
```

It MUST NOT emit `NaN` or `Infinity` for any input that passes validation —
guarded by a property test, not by inspection. It is pure: same input, same
output, no clock, no randomness, no I/O, no dependencies.

---

## 4. Validation

Schemas live in `@mm/schemas` and are shared with the Phase 2 API, so a rule is
written once. The engine re-guards independently — a caller that skips
validation must still not be able to make it misbehave.

| Field | Rule | Message (id-ID) |
|---|---|---|
| Entry | required when the row is non-empty | `Harga entry wajib diisi` |
| Entry | integer, `≥ 1` | `Harga harus bilangan bulat minimal Rp 1` |
| Entry | `> stopLoss` | `Harga entry harus di atas SL (Rp {sl})` |
| Entry | tick-aligned | `Dibulatkan ke fraksi harga Rp {tick}` *(info on blur, not an error)* |
| Entry | no duplicates | `Harga entry {price} sudah dipakai di Buy {n}` |
| Entry rows | `1 ≤ n ≤ 20` | `Minimal 1 entry` / `Maksimal 20 entry` |
| SL | required, integer `≥ 1` | `Harga SL wajib diisi` |
| SL | `< min(entries)` | `SL harus di bawah semua harga entry` |
| Risk | `0.1 – 10` | `Risiko harus antara 0,1% dan 10%` |
| Buy fee | `0 – 1` | `Fee harus antara 0% dan 1%` |
| Sell fee | `0 – 1.5` | `Fee jual harus antara 0% dan 1,5%` |
| Balance | integer `≥ 100.000` | `Balance minimal Rp 100.000` |
| Balance | `≤ 1.000.000.000.000` | `Balance tidak masuk akal` |
| TP | optional; `> max(entries)` | `TP harus di atas harga entry tertinggi` |

Rules:

- Errors render **inline, under the field**, in red, with `aria-describedby`
  wiring the message to the input and `aria-invalid` on the input itself.
- Validation runs on **blur** and on submit, never on every keystroke. Typing
  `1` on the way to `1000` must not flash "harus di atas SL".
- The result area does not disappear when a field goes invalid. It dims and
  keeps the last valid result, so the user is not left staring at nothing while
  correcting a typo.
- Every numeric field is clamped, not just rejected: pasting `999999999999999`
  into balance yields the maximum with a message, not a crash.

---

## 5. Number formatting

Locale is **id-ID** throughout: `.` groups thousands, `,` is the decimal mark.

| Kind | Format | Example |
|---|---|---|
| Price | integer, grouped | `1.000` · `10.500` |
| Money | integer, grouped, `Rp` prefix | `Rp 220.000` |
| Percent | 1 decimal, comma | `0,6%` · `1,0%` |
| Lot | integer, no grouping under 1000 | `3` |
| Average | 1 decimal, comma | `733,3` |
| Risk:reward | `1 : n,n` | `1 : 2,4` |

Implementation rules:

- `Intl.NumberFormat('id-ID')` — never hand-rolled separator logic.
- Every figure that appears in a column MUST use `font-variant-numeric:
  tabular-nums`. Proportional digits make a numeric column impossible to scan.
- Negative money is shown as `−Rp 40.000` with a real minus sign (U+2212), not a
  hyphen, and paired with colour. Colour is never the only signal.
- Formatted display, unformatted value: components hold a raw `number` in state
  and format for display. Formatted strings are never parsed back into state.

### 5.1 Live-formatted numeric input

Price and balance fields group digits **as the user types**, which requires
restoring the caret — naive reformatting jumps it to the end after every
keystroke and makes the field unusable.

```
1. Strip everything except digits from the raw input value.
2. Count the digits to the LEFT of the caret (not characters — separators shift).
3. Reformat the digit string with Intl.NumberFormat('id-ID').
4. Walk the formatted string, counting digits, until that count is reached.
   Place the caret there.
```

Additional rules for these inputs:

- `inputMode="numeric"` so phones show the number pad; type stays `text`,
  because `type="number"` cannot contain separators and brings scroll-wheel
  increments and browser spinners we do not want.
- Paste is sanitised: `Rp 10.000.000`, `10,000,000`, and `10 000 000` all yield
  `10000000`. Users paste from spreadsheets and from chat.
- Leading zeros collapse. An empty field is empty, not `0` — `0` is a value the
  user did not enter.
- Suffix shorthand: typing `10jt` or `10rb` in the balance field expands on blur
  to `10.000.000` / `10.000`. This is input convenience only; the stored and
  displayed value is always whole rupiah.

---

## 6. Screen behaviour

1. **Top bar** — logo, ticker search (`⌘K` / tap), theme toggle, install button.
2. **Ticker picker** — optional. Command palette over the bundled IDX list,
   fuzzy on code and company name, recents first. See
   [ticker-data.md](ticker-data.md).
3. **Entry ladder** — Buy 1..N with add / remove / reorder.
4. **Parameters** — SL, Risk, Fee, Balance.
5. **Result table** — Entry · SL · Lot · %m · Rp, plus a total row.
6. **Warnings** — see §3.3.
7. **Summary** — Actual and Planned side by side, TP input, profit, risk:reward.
8. **Actions** — Simpan ke Portofolio · Bagikan · Salin ringkasan · Reset.

Calculation is **live**, debounced 300ms, so the table tracks typing. An explicit
**Hitung** button remains: it is the habit users bring from the reference tool,
and on mobile it gives a definite way to commit and dismiss the keyboard.

**Bagikan** encodes the whole input state into the URL hash — no server, no
shortener, nothing stored. A pasted link reconstructs the exact plan, which is
how this tool spreads.

**Salin ringkasan** copies a plain-text block sized for WhatsApp and Telegram:

```
BREN · Rencana beli
Buy 1  1.000  →  0 lot
Buy 2    900  →  0 lot
Buy 3    800  →  1 lot   Rp 80.000
Buy 4    700  →  2 lot   Rp 140.000
Total: 3 lot · Rp 220.000 · avg 733
SL 600 · risiko Rp 40.000 (0,4%m)
```

Reset asks for confirmation only when a saved plan is open; on a scratch
calculation it just resets.

---

## 7. Out of scope

Named here so they are not accidentally built: live/last prices, ARA-ARB limits,
short selling, margin, multi-currency, non-IDX markets, weighted (non-equal)
risk distribution across the ladder, and trailing stops. Weighted distribution is
the most likely Phase 7 addition — the engine's per-entry loop is already the
right seam for it.
