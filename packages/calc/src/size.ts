import { describePosition, existingRiskAtStop, inferMode } from './average.js';
import {
  LOT_SIZE,
  MAX_BALANCE,
  MAX_BUY_FEE_PERCENT,
  MAX_ENTRIES,
  MAX_RISK_PERCENT,
  MAX_SELL_FEE_PERCENT,
  MIN_BALANCE,
  MIN_FEE_PERCENT,
  MIN_RISK_PERCENT,
} from './constants.js';
import { calcError } from './errors.js';
import { summarise } from './summary.js';
import type {
  AveragingResult,
  CalcResult,
  EntryRow,
  PlanInput,
  PlanOutput,
} from './types.js';
import { buildWarnings } from './warnings.js';

/** Truncate toward zero at one decimal: 0.625 → 0.6, 1.75 → 1.7. Not rounding. */
export function trunc1(n: number): number {
  return Math.trunc(n * 10) / 10;
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/**
 * The sizing engine.
 *
 * Pure: same input, same output, no clock, no randomness, no I/O. It never
 * throws — invalid input comes back as a typed error — and never returns NaN or
 * Infinity for input that passes validation.
 */
export function calculate(input: PlanInput): CalcResult {
  const {
    entries,
    stopLoss,
    riskPercent,
    buyFeePercent,
    sellFeePercent,
    balance,
    takeProfit = null,
    existing = null,
  } = input;

  // ── validation ────────────────────────────────────────────────────────────
  if (!Array.isArray(entries) || entries.length === 0) return calcError('NO_ENTRIES');
  if (entries.length > MAX_ENTRIES) {
    return calcError('TOO_MANY_ENTRIES', { count: entries.length, max: MAX_ENTRIES });
  }
  if (!isPositiveFinite(stopLoss)) return calcError('INVALID_STOP');
  if (!entries.every(isPositiveFinite)) return calcError('ENTRY_NOT_ABOVE_STOP', { stopLoss });

  const belowStop = entries.find((e) => e <= stopLoss);
  if (belowStop !== undefined) {
    return calcError('ENTRY_NOT_ABOVE_STOP', { entry: belowStop, stopLoss });
  }

  const seen = new Set<number>();
  for (const e of entries) {
    if (seen.has(e)) return calcError('DUPLICATE_ENTRY', { entry: e });
    seen.add(e);
  }

  if (!isPositiveFinite(balance) || balance < MIN_BALANCE) {
    return calcError('BALANCE_TOO_SMALL', { balance: balance ?? 0, min: MIN_BALANCE });
  }
  if (balance > MAX_BALANCE) {
    return calcError('BALANCE_TOO_LARGE', { balance, max: MAX_BALANCE });
  }
  if (
    !Number.isFinite(riskPercent) ||
    riskPercent < MIN_RISK_PERCENT ||
    riskPercent > MAX_RISK_PERCENT
  ) {
    return calcError('INVALID_RISK', { riskPercent, min: MIN_RISK_PERCENT, max: MAX_RISK_PERCENT });
  }
  if (
    !Number.isFinite(buyFeePercent) ||
    buyFeePercent < MIN_FEE_PERCENT ||
    buyFeePercent > MAX_BUY_FEE_PERCENT
  ) {
    return calcError('INVALID_FEE', { fee: buyFeePercent, max: MAX_BUY_FEE_PERCENT });
  }
  if (
    !Number.isFinite(sellFeePercent) ||
    sellFeePercent < MIN_FEE_PERCENT ||
    sellFeePercent > MAX_SELL_FEE_PERCENT
  ) {
    return calcError('INVALID_FEE', { fee: sellFeePercent, max: MAX_SELL_FEE_PERCENT });
  }

  const maxEntry = Math.max(...entries);
  if (takeProfit !== null && takeProfit !== undefined) {
    if (!isPositiveFinite(takeProfit) || takeProfit <= maxEntry) {
      return calcError('INVALID_TAKE_PROFIT', { takeProfit, maxEntry });
    }
  }

  if (existing !== null && existing !== undefined) {
    if (
      !isPositiveFinite(existing.lots) ||
      !Number.isInteger(existing.lots) ||
      !isPositiveFinite(existing.avgPrice)
    ) {
      return calcError('INVALID_EXISTING_POSITION');
    }
    if (inferMode(entries, existing.avgPrice) === 'mixed') {
      return calcError('MIXED_AVERAGING_LADDER', { avgPrice: existing.avgPrice });
    }
  }

  // ── sizing ────────────────────────────────────────────────────────────────
  const buyFee = buyFeePercent / 100;
  const sellFee = sellFeePercent / 100;
  const riskBudget = (balance * riskPercent) / 100;

  // The existing position already consumes risk budget. Sizing new entries
  // against the full budget would double-count it and quietly take the user well
  // past the risk they configured.
  const existingRisk = existing ? existingRiskAtStop(existing, stopLoss) : 0;
  const headroom = riskBudget - existingRisk;
  const blocked = existing !== null && existing !== undefined && headroom <= 0;

  const budgetForNew = existing ? headroom : riskBudget;
  const riskPerEntry = blocked ? 0 : budgetForNew / entries.length;

  const rows: EntryRow[] = entries.map((entry, i) => {
    const sharesPlanned = blocked ? 0 : riskPerEntry / (entry - stopLoss);
    const valuePlanned = sharesPlanned * entry;
    const lots = Math.floor(sharesPlanned / LOT_SIZE);
    const sharesActual = lots * LOT_SIZE;
    return {
      index: i + 1,
      entry,
      stopLoss,
      sharesPlanned,
      valuePlanned,
      pctOfModal: trunc1((valuePlanned / balance) * 100),
      lots,
      sharesActual,
      valueActual: sharesActual * entry,
    };
  });

  const plannedShares = rows.reduce((a, r) => a + r.sharesPlanned, 0);
  const plannedValue = rows.reduce((a, r) => a + r.valuePlanned, 0);
  const plannedLoss = rows.reduce((a, r) => a + r.sharesPlanned * (r.entry - stopLoss), 0);

  const actualShares = rows.reduce((a, r) => a + r.sharesActual, 0);
  const actualValue = rows.reduce((a, r) => a + r.valueActual, 0);
  const actualLoss = rows.reduce((a, r) => a + r.sharesActual * (r.entry - stopLoss), 0);

  const planned = summarise({
    shares: plannedShares,
    totalValue: plannedValue,
    lossAtStop: plannedLoss,
    balance,
    takeProfit,
    buyFee,
    sellFee,
  });

  const actual = summarise({
    shares: actualShares,
    totalValue: actualValue,
    lossAtStop: actualLoss,
    balance,
    takeProfit,
    buyFee,
    sellFee,
  });

  const totalLots = rows.reduce((a, r) => a + r.lots, 0);

  // The total is the SUM OF THE TRUNCATED ROWS (4.0), not the truncation of the
  // true sum (4.125). A column that does not add up to its own total reads as a
  // bug — and this matches the reference tool.
  const totalPctOfModal = trunc1(rows.reduce((a, r) => a + r.pctOfModal, 0));

  let averaging: AveragingResult | null = null;
  if (existing) {
    const existingShares = existing.lots * LOT_SIZE;
    const before = describePosition({
      shares: existingShares,
      totalValue: existingShares * existing.avgPrice,
      stopLoss,
      buyFee,
      sellFee,
    });
    const after = describePosition({
      shares: existingShares + actualShares,
      totalValue: existingShares * existing.avgPrice + actualValue,
      stopLoss,
      buyFee,
      sellFee,
    });
    averaging = {
      mode: inferMode(entries, existing.avgPrice) as 'down' | 'up',
      blocked,
      existingRisk,
      headroom,
      before,
      after,
    };
  }

  const data: PlanOutput = {
    rows,
    riskBudget,
    riskPerEntry,
    totalPctOfModal,
    planned,
    actual,
    warnings: buildWarnings({
      totalLots,
      riskBudget,
      balance,
      entryCount: entries.length,
      planned,
      actual,
    }),
    averaging,
  };

  return { ok: true, data };
}
