# Design System — Tokens

Source of truth: [`tokens.json`](tokens.json). `packages/ui` generates Tailwind
v4 CSS custom properties from it. The generated CSS is never hand-edited.

Visual reference: Stockbit — a familiar surface for the audience, and one built
for scanning dense numbers rather than reading prose.

---

## Colour

### Semantic, not decorative

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `brand.green` | `#00AB6B` | same | Buy · bullish · profit · primary action |
| `brand.red` | `#F0403C` | same | Sell · bearish · loss · stop loss |
| `brand.blue` | `#2E6BE6` | same | Informational · links · focus ring |
| `brand.amber` | `#D97706` | same | Warning |

Green and red mean *direction of money*. They are never used as decoration, and
a green button that does not buy something is a bug.

Amber exists because a warning is not a loss. Using red for both — the obvious
shortcut — means "your plan under-uses your risk budget" reads with the same
urgency as "you are down Rp 40.000", and the user learns to ignore both.

### The readout

One dark instrument panel — `readout.bg` `#0B1F17` in light, `#1C2B24` in dark —
carrying the lot count, total capital and real risk.

This is the only place the design spends any boldness, and it exists because the
first build buried the answer: the whole product answers "how many lots do I
buy?", and that number was rendered as small text in a table below every input.
On a phone it sat four screens down.

Note the dark value is *lighter* than its ground while the light value is much
darker than its own. Inverting the treatment literally would make the panel
vanish into the page; what has to survive the theme flip is the panel reading as
a distinct object, not its specific lightness.

### Grounds

| Token | Light | Dark |
|---|---|---|
| `bg` | `#FAFBFA` | `#0E1116` |
| `surface` | `#FFFFFF` | `#161B22` |
| `surface2` | `#F1F4F2` | `#1C232C` |
| `border` | `#E1E6E2` | `#262C36` |
| `border2` | `#CFD6D1` | `#333B47` |
| `text` | `#0C120F` | `#E6E8EB` |
| `muted` | `#67746C` | `#8B949E` |
| `faint` | `#98A39C` | `#6B747E` |

The neutrals carry a slight green bias, picked to sit under the accent rather
than fight it. A pure grey next to `#00AB6B` reads as unconsidered.

Dark values follow Stockbit's desktop app: near-black ground, lifted panels, low
contrast borders. Dark is **not** an inversion of light — it is a second
designed palette. Naive inversion produces glowing white surfaces and a green
that vibrates.

### Contrast

WCAG 2.1 AA is the floor. Verified pairs:

| Pair | Ratio | |
|---|---|---|
| `light.text` on `light.bg` | 17.8:1 | ✓ |
| `light.muted` on `light.bg` | 5.1:1 | ✓ |
| `dark.text` on `dark.bg` | 14.2:1 | ✓ |
| `dark.muted` on `dark.bg` | 5.9:1 | ✓ |
| `brand.green` on `light.bg` | 3.2:1 | ✗ text — **large text and non-text only** |
| white on `brand.green` | 3.3:1 | ✗ small text — button labels are ≥16px semibold |

The green is deliberately the market green rather than an accessible-contrast
substitute; the constraint is therefore on *how it is used*. It never carries
body-size text on a light ground. Numeric figures tinted green use the darker
`#009459` in light mode.

### The colour-alone rule

Colour never carries meaning by itself (WCAG 1.4.1). Every green/red figure is
paired with a sign or glyph:

```
▲ +Rp 167.666      ▼ −Rp 40.000       +5 lot       −52
```

This is checked in review and asserted in component tests, because it is the
accessibility failure this particular product is most prone to.

---

## Typography

Two families, sharply divided by role.

| Role | Stack | Used for |
|---|---|---|
| `font.sans` | `system-ui, -apple-system, Segoe UI, Roboto` | **All UI text**: labels, buttons, prose, headings |
| `font.mono` | `ui-monospace, SF Mono, JetBrains Mono, Menlo, Consolas` | **Figures, tickers and the readout — nothing else** |

> **Corrected after the first build.** The original rule made monospace the
> display voice for headings, labels and buttons as well. Applied to everything,
> it stopped reading as "order book" and started reading as terminal output — the
> page looked like an unstyled log dump rather than a product. Monospace earns
> its keep on *numbers*, where it aligns digits and signals precision. Everywhere
> else it costs legibility for no gain.

Both are **system stacks — no webfonts.** A trading tool must render instantly on
a bad connection, and a font that fails to load on a phone in a tunnel is worse
than one that was never requested.

### Scale

| Token | Size | Line height | Notes |
|---|---|---|---|
| `caption` | 11px | 1.45 | uppercase, `0.1em` tracking |
| `label` | 12px | 1.5 | |
| `data` | 14px | 1.5 | table figures |
| `body` | 15px | 1.6 | |
| `bodyLg` | 16px | 1.6 | |
| `heading` | 20px | 1.3 | |
| `title` | 24px | 1.2 | `-0.02em` |
| `display` | 32px | 1.1 | `-0.03em` |

Nothing off the scale. Running prose stays near 65 characters.

### Numerals

```css
font-variant-numeric: tabular-nums;
```

Applied to **every** figure without exception. Proportional digits make a
numeric column impossible to scan, which defeats the point of the result table.

---

## Space, radius, motion

Spacing scale `4 · 8 · 12 · 16 · 24 · 32 · 48`. Layout uses flex/grid `gap`, not
per-element margins — collapsing and doubling margins are the two most common
spacing bugs and `gap` has neither.

Radius `4 / 8 / 12` and `full` for pills. Inputs and buttons `md`; cards `lg`;
badges `full`.

Motion is restrained: `120ms` for state changes, `200ms` for entrances, one
easing curve. There are no decorative animations — a calculator that flourishes
between the user and their number is a worse calculator. All motion is disabled
under `prefers-reduced-motion: reduce`.

---

## Theme implementation

Light is the MVP default; dark ships in the same release.

```css
:root { /* light tokens */ }

@media (prefers-color-scheme: dark) {
  :root { /* dark tokens — token values only, never component rules */ }
}

:root[data-theme="dark"]  { /* dark tokens again */ }
:root[data-theme="light"] { /* light tokens again */ }
```

Three rules that keep this from breaking:

1. **Components style through tokens only.** No component rule ever lives inside
   the media query. If a component needs to know the theme, a token is missing.
2. **The explicit attribute must win in both directions.** A user on a dark OS
   who picks light must get light; that only works if `[data-theme="light"]`
   re-declares the light values after the media query.
3. **No flash.** The theme is read from `mm:prefs:v1` and applied by a blocking
   inline script in `<head>` before first paint. A dark-mode user seeing a white
   flash on every load is the most visible possible bug.

`<meta name="theme-color">` is declared per scheme so the mobile status bar
matches; the manifest value alone leaves dark mode showing the light green.
