/**
 * id-ID formatting. `Intl` is used everywhere — never hand-rolled separator
 * logic. This lives in @mm/ui rather than @mm/calc because the engine has no
 * locale and must stay dependency-free.
 */

const GROUPED = new Intl.NumberFormat('id-ID');

export function formatGrouped(n: number): string {
  return GROUPED.format(Math.round(n));
}

export function formatDecimal(n: number, digits: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/** `Rp 220.000`. Negative amounts use a real minus sign (U+2212), not a hyphen. */
export function formatRupiah(n: number): string {
  const rounded = Math.round(n);
  return rounded < 0 ? `−Rp ${GROUPED.format(-rounded)}` : `Rp ${GROUPED.format(rounded)}`;
}

/** `0,6%` */
export function formatPercent(n: number, digits = 1): string {
  return `${formatDecimal(n, digits)}%`;
}

/** `1 : 2,4`, or an em dash when there is nothing to compare. */
export function formatRatio(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return `1 : ${formatDecimal(n, 1)}`;
}

/**
 * Signed money with a direction glyph. Colour is never the only carrier of
 * meaning (WCAG 1.4.1), so the glyph travels with the value.
 */
export function formatSignedRupiah(n: number): string {
  const rounded = Math.round(n);
  if (rounded > 0) return `▲ Rp ${GROUPED.format(rounded)}`;
  if (rounded < 0) return `▼ Rp ${GROUPED.format(-rounded)}`;
  return `Rp 0`;
}

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Parse whatever the user typed or pasted into a number.
 *
 * Stripping every non-digit means `Rp 10.000.000`, `10,000,000` and
 * `10 000 000` all land on the same value with no special paste handling —
 * people paste from spreadsheets and from chat.
 *
 * Empty stays `null`, never `0`: zero is a value the user entered, empty is not.
 */
export function parseNumericInput(s: string): number | null {
  const d = digitsOnly(s).replace(/^0+(?=\d)/, '');
  return d === '' ? null : Number(d);
}

/** Expand the shorthand people actually type into a balance field. */
export function expandShorthand(s: string): number | null {
  const m = /^\s*([\d.,\s]+)\s*(rb|jt|m|k)?\s*$/i.exec(s);
  if (!m) return parseNumericInput(s);
  const base = parseNumericInput(m[1] ?? '');
  if (base === null) return null;
  const unit = (m[2] ?? '').toLowerCase();
  const mult = unit === 'rb' || unit === 'k' ? 1_000 : unit === 'jt' ? 1_000_000 : unit === 'm' ? 1_000_000_000 : 1;
  return base * mult;
}
