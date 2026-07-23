# Design System — Components

Lives in `packages/ui`, built on Radix primitives with CVA variants — the same
conventions as `revamp/apps/web`, so the two codebases read alike.

## Inventory

| Component | Built on | Notes |
|---|---|---|
| `Button` | native | Variants: `primary` (green), `secondary`, `ghost`, `danger`. Sizes `sm`/`md`/`lg`; `md` is 44px tall. |
| `NumericInput` | native | The important one — see below. |
| `Select` | Radix Select | Risk and fee presets. Native `<select>` on touch is left alone where it is better. |
| `Combobox` | cmdk | Ticker palette. |
| `Card` | — | `surface` ground, `lg` radius, `border`. |
| `DataTable` | native `<table>` | Semantic table with `scope` on headers. Never a grid of divs. |
| `DataCards` | — | The below-`sm` form of `DataTable`. |
| `Badge` | — | Status pills. Variants `neutral`/`bull`/`bear`/`warning`. |
| `Callout` | — | Warnings. Variants `info`/`warning`/`danger`. |
| `Toast` | sonner | Save confirmations, undo, SW update. |
| `Sheet` | Radix Dialog | Mobile ticker palette and confirmations. |
| `Tooltip` | Radix Tooltip | Never the only route to information — invisible on touch. |
| `Switch` | Radix Switch | Theme toggle. |
| `Disclosure` | Radix Collapsible | "Pengaturan lanjutan". |

## `NumericInput`

The component the product lives or dies on. Every price and money field is one.

```tsx
interface NumericInputProps {
  value: number | null;          // raw — never a formatted string
  onChange: (v: number | null) => void;
  prefix?: string;               // "Rp"
  suffix?: string;               // "%"
  min?: number;
  max?: number;
  step?: number;                 // tick size, for snapping on blur
  snapOnBlur?: boolean;
  error?: string;
  label: string;
}
```

Behaviour:

- Holds a raw `number | null` in state; formats for display with
  `Intl.NumberFormat('id-ID')`. Formatted strings are never parsed back into
  state.
- Groups thousands **as you type**, preserving the caret by digit index — see
  `specs/features/calculator.md` §5.1. Naive reformatting sends the caret to the
  end on every keystroke and makes the field unusable.
- `inputMode="numeric"`, `type="text"`. `type="number"` cannot contain
  separators and adds scroll-wheel increments we do not want.
- Sanitises paste: `Rp 10.000.000`, `10,000,000`, `10 000 000` → `10000000`.
- Empty is `null`, not `0`. Zero is a value the user entered; empty is not.
- Snaps to `step` on **blur** only, with an info message naming the tick.
- Clamps to `min`/`max` rather than rejecting, and says what it did.
- `aria-invalid` plus `aria-describedby` pointing at the error element.

## Rules for all components

**Accessibility**

- Every interactive element has a visible focus ring: `3px`, `brand.blue`, `2px`
  offset. Never `outline: none` without a replacement.
- Interactive elements are ≥44px tall on touch.
- Icon-only buttons carry an `aria-label`.
- Colour is never the sole carrier of meaning — pair with a glyph or sign.
- Dynamic result changes are announced via a polite live region; a screen reader
  user must not have to hunt for what changed after typing.

**Composition**

- Presentational only. No component fetches, calculates, or touches storage.
- Variants via CVA, never boolean prop explosions.
- `className` is always forwarded and merged with `tailwind-merge`.
- Polymorphism through Radix `Slot` (`asChild`), not a `as` prop.

**Theming**

- Components reference CSS custom properties, never literal hex values. A hex in
  a component file is a bug — it cannot follow the theme.

**Testing**

- Each component: renders, keyboard-operable, `axe` clean, both themes.
- `NumericInput` additionally: caret position after formatting, paste
  sanitisation, blur snapping, clamping, and the empty-vs-zero distinction.
