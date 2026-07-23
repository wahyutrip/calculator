# Design System — Responsive

Mobile-first, genuinely. The reference tool is a desktop layout, and its
five-column table is unreadable on a phone. Most of our users will be on a phone.

## Breakpoints

| Token | Width | Target |
|---|---|---|
| base | < 640px | Phones. **The design target.** |
| `sm` | ≥ 640px | Large phones, small tablets |
| `md` | ≥ 768px | Tablets |
| `lg` | ≥ 1024px | Desktop |
| `xl` | ≥ 1280px | Wide desktop — content caps at 1180px, no further growth |

Design at 360px first. Anything that only works at 1280px is not done.

---

## How each region reflows

### Entry ladder

One compact line per rung at every width: `Buy N` · price · the lot it buys · a
remove control. The price input is sized to its content rather than stretched, and
the tick hint only appears when a value actually snapped.

Reordering was **removed**, not restyled. The engine sorts internally, so the
▲/▼ buttons changed nothing while costing three targets on every row — twelve
controls of chrome for four prices in the first build.

Adding a row scrolls it into view and focuses it; an entry you then have to hunt
for is the failure mode on a phone.

### Parameters (SL · Balance · Risk · Fee)

2-up from `sm`, stacked below. Stop loss is always first — it is the field the
whole calculation hangs on.

### The answer comes first

The layout is one grid with three areas — `readout`, `form`, `detail` — in that
DOM order. A phone gets them stacked, with the readout `position: sticky` under
the top bar so the lot count stays visible while the form is edited below it.
At `lg` the same three items are re-placed into two columns:

```
"form  readout"
"form  detail"
```

No duplicated markup and no JS width measurement — measuring width in JS gives a
hydration mismatch and a visible layout swap on load.

This replaced a first attempt that put the form first and the answer second,
which on a phone meant the product's entire output was below four screens of
inputs. Sticky positioning cannot rescue something that is already below.

### Result table

Each rung shows its own lot count **inline in the ladder**, so the per-entry
answer is where the price is typed. The detail table is therefore supporting
material and simply scrolls inside its own `overflow-x: auto` container on narrow
screens — the earlier stacked-card treatment cost far more vertical space than it
earned once the answer moved to the top.

Rows with `0 lot` render muted throughout, so a ladder rung that buys nothing
never looks like a result.

### Summary — Actual / Planned

One aligned three-column comparison (label · actual · planned) rather than two
separate cards. Reading the *difference* is the entire point, and two cards side
by side forced the eye to jump between them to do it. Planned is the muted
column: it is the reference, not the number you will trade.

---

## Touch and input

- Minimum target 44×44px, minimum 8px between adjacent targets.
- `inputMode="numeric"` on every price and balance field so the number pad
  appears. Type stays `text` — `type="number"` cannot hold thousand separators.
- Font size ≥16px on all inputs. Below that, iOS Safari zooms the viewport on
  focus and the user is left scrolled sideways with no obvious way back.
- No hover-only affordances. Every hover cue has a focus and an active state.

## Safe areas and chrome

```css
padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
```

Installed on iOS in standalone mode, the home indicator overlaps the bottom of
the viewport. Without the inset, the last entry row sits underneath it.

`viewport-fit=cover` in the viewport meta; `100dvh` rather than `100vh` so the
layout does not jump as mobile browser chrome hides and reveals.

## Verification

- Playwright viewports: 360×640, 390×844, 768×1024, 1440×900.
- Assert the page body never scrolls horizontally at any of them — this is the
  regression that keeps coming back.
- Assert the readout renders **above** the form on a phone. This is the property
  the whole layout exists for, so it is asserted rather than eyeballed.
- axe accessibility assertions at 360px and 1440px, in both themes.
- Manual, per release: a real Android phone and a real iPhone, installed to the
  home screen. Emulated viewports do not reproduce safe areas, input zoom, or
  the keyboard covering the button you just told the user to tap.
