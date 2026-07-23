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
| `xl` | ≥ 1280px | Wide desktop — content caps at 1080px, no further growth |

Design at 360px first. Anything that only works at 1280px is not done.

---

## How each region reflows

### Entry ladder

| Width | Layout |
|---|---|
| < 640px | One row per line: label left, input right. Remove control is a 44px icon button at the end of the row. |
| 640–1023px | Two columns. |
| ≥ 1024px | Four columns, matching the reference tool. |

With an unlimited ladder, long lists need to stay navigable on a phone: the
**Tambah entry** button stays pinned below the last row (never scrolled away),
and adding a row scrolls it into view and focuses it. Adding an entry you then
have to hunt for is the failure mode here.

Reordering is drag-and-drop on pointer devices and ▲/▼ buttons on touch. Drag on
touch fights the page scroll; the buttons are the primary mechanism, not a
fallback.

### Parameters (SL · Risk · Fee · Balance)

Stacked below 640px, 2-up at `sm`, 4-up at `lg`. SL is always first — it is the
field the whole calculation hangs on.

### Result table — the important one

Below `sm` the table becomes **stacked cards**, one per entry. It does not
scroll sideways: a horizontally scrolling table hides the columns that matter
(Lot and Rp) exactly where the screen is narrowest.

```
┌──────────────────────────────┐
│ Buy 3            ▸ 1 lot     │
│ Entry 800  ·  SL 600         │
│ %m 1,0        Rp 80.000      │
└──────────────────────────────┘
```

Rows with `0 lot` render muted, and the total becomes a distinct summary card at
the end of the list.

At `sm` and above it is the real five-column table, inside an
`overflow-x: auto` container so the page body never scrolls sideways regardless.

This is implemented as two components — `ResultCards` and `ResultTable` — chosen
by a CSS media query, not by JS width measurement. Measuring width in JS gives a
hydration mismatch and a visible layout swap on load.

### Summary — Actual / Planned

Stacked below `md`, side by side above. **Actual always comes first** in DOM
order, so on a phone the number that matters is the one you see without
scrolling.

### Top bar

Below `sm` the ticker search collapses to an icon that opens the palette
full-screen. Theme toggle and install button stay visible; nothing important
hides behind a hamburger.

---

## Touch and input

- Minimum target 44×44px, minimum 8px between adjacent targets.
- `inputMode="numeric"` on every price and balance field so the number pad
  appears. Type stays `text` — `type="number"` cannot hold thousand separators.
- Font size ≥16px on all inputs. Below that, iOS Safari zooms the viewport on
  focus and the user is left scrolled sideways with no obvious way back.
- The **Hitung** button is reachable in the thumb zone without scrolling on a
  typical phone once the ladder has 4 rows.
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
- Assert the card layout renders below `sm` and the table at and above it.
- axe accessibility assertions at 360px and 1440px, in both themes.
- Manual, per release: a real Android phone and a real iPhone, installed to the
  home screen. Emulated viewports do not reproduce safe areas, input zoom, or
  the keyboard covering the button you just told the user to tap.
