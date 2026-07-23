import { describe, expect, it } from 'vitest';
import { calculate } from '../size.js';
import type { PlanInput } from '../types.js';

/**
 * The reference case, locked.
 *
 * This test does NOT change to accommodate a refactor. If it fails, the engine is
 * wrong — the whole product is this table being right.
 *
 * Entries 1000/900/800/700 · SL 600 · risk 1.0% · fee 0.4% · balance 10.000.000
 */
const GOLDEN: PlanInput = {
  entries: [1000, 900, 800, 700],
  stopLoss: 600,
  riskPercent: 1.0,
  buyFeePercent: 0.4,
  sellFeePercent: 0.5,
  balance: 10_000_000,
  takeProfit: 1400,
};

describe('golden case', () => {
  const result = calculate(GOLDEN);
  if (!result.ok) throw new Error(`golden case must compute: ${result.error.code}`);
  const { data } = result;

  it('splits the risk budget equally across the ladder', () => {
    expect(data.riskBudget).toBe(100_000);
    expect(data.riskPerEntry).toBe(25_000);
  });

  it('produces the exact lot column 0 / 0 / 1 / 2', () => {
    expect(data.rows.map((r) => r.lots)).toEqual([0, 0, 1, 2]);
  });

  it('produces the exact %m column 0.6 / 0.7 / 1.0 / 1.7', () => {
    expect(data.rows.map((r) => r.pctOfModal)).toEqual([0.6, 0.7, 1.0, 1.7]);
  });

  it('produces the exact Rp column 0 / 0 / 80.000 / 140.000', () => {
    expect(data.rows.map((r) => r.valueActual)).toEqual([0, 0, 80_000, 140_000]);
  });

  it('totals 3 lots and Rp 220.000', () => {
    expect(data.rows.reduce((a, r) => a + r.lots, 0)).toBe(3);
    expect(data.actual.totalValue).toBe(220_000);
  });

  it('totals %m as the SUM OF TRUNCATED ROWS (4.0), not the truncated true sum (4.125)', () => {
    expect(data.totalPctOfModal).toBe(4.0);
  });

  it('reports planned loss equal to the risk budget', () => {
    expect(data.planned.lossAtStop).toBeCloseTo(100_000, 6);
    expect(data.planned.lossPercentOfBalance).toBeCloseTo(1.0, 6);
  });

  it('reports planned average 792.0 and actual average 733.3', () => {
    expect(data.planned.averagePrice).toBeCloseTo(792.0, 1);
    expect(data.actual.averagePrice).toBeCloseTo(733.3, 1);
  });

  it('reports the real exposure: actual loss 40.000, only 0.4% of balance', () => {
    expect(data.actual.lossAtStop).toBe(40_000);
    expect(data.actual.lossPercentOfBalance).toBeCloseTo(0.4, 6);
  });

  it('warns that whole-lot rounding left the risk budget under-used', () => {
    const w = data.warnings.find((x) => x.code === 'RISK_UNDERUSED');
    expect(w).toBeDefined();
    expect(w?.values.actualLoss).toBe(40_000);
    expect(w?.values.riskBudget).toBe(100_000);
  });

  it('computes fee-aware profit at TP 1400', () => {
    // 300 shares: 300 × 1400 × 0.995 − 220.000 × 1.004
    const expected = 300 * 1400 * 0.995 - 220_000 * 1.004;
    expect(data.actual.profitAtTarget).toBeCloseTo(expected, 6);
    expect(data.actual.profitAtTarget).toBeLessThan(300 * (1400 - 733.33));
  });

  it('reports a risk:reward ratio', () => {
    expect(data.actual.riskReward).toBeCloseTo((data.actual.profitAtTarget ?? 0) / 40_000, 6);
  });
});
