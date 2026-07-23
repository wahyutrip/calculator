# Feature — Average Down / Average Up

Plans a *second* purchase against a position the user already holds. Available
from any saved plan marked **Terisi** (filled), or by entering a position
manually.

Route: `/` with `mode=avg` · Engine: `packages/calc/src/average.ts`

---

## 1. Input

```ts
interface ExistingPosition {
  lots: number;      // > 0, whole lots
  avgPrice: number;  // > 0, the price actually paid, fees included if known
}
```

Entering the mode reveals two fields — **Lot dimiliki** and **Harga rata-rata** —
pre-filled from the saved plan when one is open. Everything else on the screen
works exactly as in a normal calculation.

The mode is **inferred, not chosen**. If every new entry sits below
`existing.avgPrice` it is an average down; if every entry sits above, an average
up. A ladder straddling the average is neither, and is rejected with
*"Entry harus semuanya di bawah atau semuanya di atas harga rata-rata."* — a
mixed ladder has no coherent risk interpretation and silently picking one
behaviour would mislead.

---

## 2. Average down

New entries below the current average. The position is losing; the user is
lowering their cost basis.

The critical constraint the reference tool ignores: **the existing position
already consumes risk budget.** Sizing the new entries against the full budget
double-counts it, and the user ends up risking far more than they configured.

```
existingShares = existing.lots × 100
existingRisk   = existingShares × (existing.avgPrice − stopLoss)
riskBudget     = balance × riskPercent / 100
headroom       = riskBudget − existingRisk
riskPerEntry   = headroom / entries.length
```

`headroom` replaces `riskBudget` everywhere in the sizing loop; the rest of the
algorithm is unchanged.

**When `headroom <= 0`** the engine returns every row at `lots: 0` together with
`blocked: true` and a reason — never an empty or silently zeroed table:

> *Posisi Anda sekarang sudah berisiko Rp {existingRisk} di SL {sl}, melebihi
> anggaran risiko Rp {riskBudget}. Menambah posisi akan memperbesar kerugian.
> Turunkan SL, kurangi posisi, atau naikkan toleransi risiko.*

This is the single most important behaviour in the feature. Averaging down into
a position that is already over budget is how retail accounts are destroyed, and
a tool that quietly hands back lot numbers is endorsing it.

---

## 3. Average up

New entries above the current average — pyramiding into a winner. The stop loss
is typically raised at the same time.

Sizing uses the same headroom formula, but `existingRisk` can now be **negative**
(when `stopLoss > existing.avgPrice`, the held position is locked into profit
even at the stop). A negative `existingRisk` correctly *increases* headroom:
realised safety on the old position genuinely funds risk on the new one. The
engine MUST NOT clamp it to zero.

The output additionally reports:

```
blendedShares = existingShares + Σ sharesActual
blendedValue  = existingShares × existing.avgPrice + Σ valueActual
blendedAvg    = blendedValue / blendedShares
riskFree      = blendedAvg <= stopLoss        // ← the number pyramiders want
breakEven     = blendedAvg × (1 + buyFee) / (1 − sellFee)
```

`riskFree` gets a prominent badge when true: **"Posisi bebas risiko"** — at this
stop, the whole position exits at or above cost.

`breakEven` is fee-inclusive. The naive break-even (`blendedAvg`) is wrong by
roughly 0,9% on default fees, which on a tight trade is the difference between a
small win and a small loss.

---

## 4. Before → after

Both modes render a comparison strip. This is the primary output; the lot table
is supporting detail.

| | Sebelum | Sesudah | |
|---|---:|---:|---|
| Lot | 3 | 8 | `+5` |
| Harga rata-rata | 733 | 681 | `−52` |
| Total modal | Rp 220.000 | Rp 545.000 | `+Rp 325.000` |
| Kerugian di SL | Rp 40.000 | Rp 64.800 | `+Rp 24.800` |
| Break even | 739 | 687 | `−52` |

Deltas are signed, coloured, and carry an arrow glyph — colour alone never
carries the meaning. Note the honest framing: averaging down improves the
average **and increases the loss at stop**. Both columns are always shown
together so the trade-off cannot be missed.

---

## 5. Validation

| Rule | Message (id-ID) |
|---|---|
| `existing.lots` integer `> 0` | `Lot dimiliki minimal 1` |
| `existing.avgPrice` integer `> 0` | `Harga rata-rata wajib diisi` |
| entries all below **or** all above the average | `Entry harus semuanya di bawah atau semuanya di atas harga rata-rata` |
| avg down: `stopLoss < min(entries)` | `SL harus di bawah semua harga entry` |
| avg up: `stopLoss < min(entries)` | as above — a raised SL still sits below the new entries |
| existing position value `≤ balance` | `Posisi Anda melebihi modal yang diisi` |

---

## 6. Tests

Every branch is covered, with these cases named explicitly:

- Average down with ample headroom → lots sized off headroom, not the full budget.
- Average down with `headroom` exactly `0` → blocked, reason returned.
- Average down with `headroom < 0` → blocked, no negative lots anywhere.
- Average up with `stopLoss > avgPrice` → `existingRisk` negative, headroom
  **grows**; assert it is not clamped.
- Average up crossing into `riskFree === true` at the exact boundary
  `blendedAvg === stopLoss`.
- A ladder straddling the average → rejected, not silently coerced.
- Break-even is strictly greater than `blendedAvg` whenever any fee is non-zero.
