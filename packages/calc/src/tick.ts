/**
 * IDX tick sizes (fraksi harga). The band is chosen by the price itself, which
 * is why snapping needs a fixed point rather than a single rounding step.
 */
export function tickSize(price: number): number {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
}

export function isTickAligned(price: number): boolean {
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(price)) return false;
  return price % tickSize(price) === 0;
}

/** One rounding step within the band the price currently falls in. */
function snapOnce(price: number): number {
  const t = tickSize(price);
  return Math.max(t, Math.round(price / t) * t);
}

/**
 * Snap a price to a legal IDX tick.
 *
 * Rounding once is not enough: a price near the top of a band can round INTO the
 * next band (1998 → tick 5 → 2000, which belongs to the tick-10 band). A second
 * pass re-checks the band after that move.
 *
 * Two passes are provably sufficient. The first pass lands on a multiple of its
 * own band's tick; the only way to leave the band is upward across a boundary,
 * and every boundary (200, 500, 2000, 5000) is itself a multiple of the larger
 * tick above it — so the second pass is always a no-op fixed point. Writing it as
 * two calls rather than a bounded loop leaves no unreachable line behind.
 */
export function snapToTick(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return snapOnce(snapOnce(Math.round(price)));
}
