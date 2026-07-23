import { LOT_SIZE } from './constants.js';
import type { BlendedPosition, ExistingPosition } from './types.js';

/** Ladder direction relative to the held average. */
export type AveragingMode = 'down' | 'up' | 'mixed';

export function inferMode(entries: number[], avgPrice: number): AveragingMode {
  const allBelow = entries.every((e) => e < avgPrice);
  if (allBelow) return 'down';
  const allAbove = entries.every((e) => e > avgPrice);
  if (allAbove) return 'up';
  // A ladder straddling the average has no coherent risk interpretation, and
  // silently picking one behaviour would mislead. Callers reject it.
  return 'mixed';
}

/**
 * Risk the existing position already carries at this stop.
 *
 * This can be NEGATIVE when the stop sits above the average — the position is
 * locked into profit even at the stop. That is not an error: realised safety on
 * the old position genuinely funds risk on the new one, so it must not be
 * clamped to zero.
 */
export function existingRiskAtStop(existing: ExistingPosition, stopLoss: number): number {
  return existing.lots * LOT_SIZE * (existing.avgPrice - stopLoss);
}

export interface BlendInput {
  shares: number;
  totalValue: number;
  stopLoss: number;
  buyFee: number;
  sellFee: number;
}

export function describePosition(input: BlendInput): BlendedPosition {
  const { shares, totalValue, stopLoss, buyFee, sellFee } = input;
  const averagePrice = shares > 0 ? totalValue / shares : 0;
  return {
    lots: shares / LOT_SIZE,
    shares,
    averagePrice,
    totalValue,
    lossAtStop: shares * (averagePrice - stopLoss),
    // Fee-inclusive. The naive break-even (the average itself) is wrong by
    // roughly 0.9% at default fees.
    breakEven: shares > 0 ? (averagePrice * (1 + buyFee)) / (1 - sellFee) : 0,
    riskFree: shares > 0 && averagePrice <= stopLoss,
  };
}
