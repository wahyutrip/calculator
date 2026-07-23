import { describe, expect, it } from 'vitest';
import { calculate } from '../size.js';
import { describePosition, existingRiskAtStop, inferMode } from '../average.js';
import type { PlanInput } from '../types.js';

const base: PlanInput = {
  entries: [700, 650],
  stopLoss: 600,
  riskPercent: 1.0,
  buyFeePercent: 0.4,
  sellFeePercent: 0.5,
  balance: 10_000_000,
};

const ok = (input: PlanInput) => {
  const r = calculate(input);
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}`);
  return r.data;
};

describe('inferMode', () => {
  it('detects average down, average up, and a straddling ladder', () => {
    expect(inferMode([700, 650], 733)).toBe('down');
    expect(inferMode([800, 850], 733)).toBe('up');
    expect(inferMode([700, 800], 733)).toBe('mixed');
    expect(inferMode([733], 733)).toBe('mixed'); // equal is neither
  });
});

describe('existingRiskAtStop', () => {
  it('is positive when the stop sits below the average', () => {
    expect(existingRiskAtStop({ lots: 3, avgPrice: 733 }, 600)).toBe(300 * 133);
  });

  it('is NEGATIVE when the stop sits above the average — not clamped', () => {
    // The held position is locked into profit even at the stop. That safety
    // genuinely funds risk on the new entries.
    expect(existingRiskAtStop({ lots: 3, avgPrice: 700 }, 750)).toBe(300 * -50);
  });
});

describe('average down', () => {
  it('sizes new entries off HEADROOM, not the full risk budget', () => {
    const existing = { lots: 3, avgPrice: 733 };
    const d = ok({ ...base, existing });

    const riskBudget = 100_000;
    const existingRisk = 300 * (733 - 600); // 39.900
    expect(d.averaging?.existingRisk).toBe(existingRisk);
    expect(d.averaging?.headroom).toBe(riskBudget - existingRisk);
    expect(d.riskPerEntry).toBeCloseTo((riskBudget - existingRisk) / 2, 6);

    // Sizing against the full budget would have given strictly more.
    const naive = ok({ ...base });
    expect(d.rows[0]!.sharesPlanned).toBeLessThan(naive.rows[0]!.sharesPlanned);
  });

  it('blocks when the existing position already exceeds the budget', () => {
    // 20 lots at 900 with a 600 stop risks 600.000 against a 100.000 budget.
    const d = ok({ ...base, existing: { lots: 20, avgPrice: 900 } });
    expect(d.averaging?.blocked).toBe(true);
    expect(d.averaging!.headroom).toBeLessThan(0);
    expect(d.rows.every((r) => r.lots === 0)).toBe(true);
    expect(d.rows.every((r) => r.sharesPlanned === 0)).toBe(true);
    expect(d.riskPerEntry).toBe(0);
  });

  it('blocks at exactly zero headroom', () => {
    // 5 lots at 800, stop 600 → 500 shares × 200 = 100.000 = the whole budget.
    // avgPrice must sit above every entry, or the ladder is a straddle.
    const d = ok({ ...base, existing: { lots: 5, avgPrice: 800 } });
    expect(d.averaging?.headroom).toBe(0);
    expect(d.averaging?.blocked).toBe(true);
    expect(d.rows.every((r) => r.lots === 0)).toBe(true);
  });

  it('never produces negative lots when blocked', () => {
    const d = ok({ ...base, existing: { lots: 50, avgPrice: 1000 } });
    expect(d.rows.every((r) => r.lots >= 0)).toBe(true);
    expect(d.rows.every((r) => r.valueActual >= 0)).toBe(true);
  });

  it('lowers the blended average and RAISES the loss at stop — both reported', () => {
    const d = ok({ ...base, existing: { lots: 3, avgPrice: 733 } });
    const { before, after } = d.averaging!;
    expect(after.averagePrice).toBeLessThan(before.averagePrice);
    expect(after.lossAtStop).toBeGreaterThan(before.lossAtStop);
    expect(after.lots).toBeGreaterThan(before.lots);
  });
});

describe('average up', () => {
  const existing = { lots: 3, avgPrice: 700 };

  it('grows headroom when the raised stop puts the position in profit', () => {
    const d = ok({
      ...base,
      entries: [900, 950],
      stopLoss: 750,
      existing,
    });
    expect(d.averaging?.mode).toBe('up');
    expect(d.averaging!.existingRisk).toBeLessThan(0);
    // Headroom must EXCEED the budget — the negative risk is not clamped away.
    expect(d.averaging!.headroom).toBeGreaterThan(d.riskBudget);
    expect(d.averaging?.blocked).toBe(false);
  });

  it('reports riskFree once the blended average sits at or below the stop', () => {
    const d = ok({ ...base, entries: [900, 950], stopLoss: 750, existing });
    // Blended average of a 700 position plus 900/950 buys is above 750 here.
    expect(d.averaging!.after.riskFree).toBe(false);

    const safe = describePosition({
      shares: 100,
      totalValue: 70_000, // average 700
      stopLoss: 750,
      buyFee: 0.004,
      sellFee: 0.005,
    });
    expect(safe.riskFree).toBe(true);
  });

  it('treats the exact boundary blendedAvg === stopLoss as risk free', () => {
    const p = describePosition({
      shares: 100,
      totalValue: 75_000, // average exactly 750
      stopLoss: 750,
      buyFee: 0,
      sellFee: 0,
    });
    expect(p.averagePrice).toBe(750);
    expect(p.riskFree).toBe(true);
  });
});

describe('break-even', () => {
  it('is strictly above the average whenever any fee is non-zero', () => {
    const withFees = describePosition({
      shares: 300,
      totalValue: 220_000,
      stopLoss: 600,
      buyFee: 0.004,
      sellFee: 0.005,
    });
    expect(withFees.breakEven).toBeGreaterThan(withFees.averagePrice);

    const noFees = describePosition({
      shares: 300,
      totalValue: 220_000,
      stopLoss: 600,
      buyFee: 0,
      sellFee: 0,
    });
    expect(noFees.breakEven).toBeCloseTo(noFees.averagePrice, 9);
  });

  it('is zero for an empty position rather than NaN', () => {
    const empty = describePosition({
      shares: 0,
      totalValue: 0,
      stopLoss: 600,
      buyFee: 0.004,
      sellFee: 0.005,
    });
    expect(empty.breakEven).toBe(0);
    expect(empty.averagePrice).toBe(0);
    expect(empty.riskFree).toBe(false);
  });
});

describe('averaging validation', () => {
  const err = (input: PlanInput) => {
    const r = calculate(input);
    if (r.ok) throw new Error('expected an error');
    return r.error;
  };

  it('rejects a ladder straddling the average rather than coercing it', () => {
    expect(err({ ...base, entries: [700, 800], existing: { lots: 3, avgPrice: 750 } }).code).toBe(
      'MIXED_AVERAGING_LADDER',
    );
  });

  it('rejects a malformed existing position', () => {
    expect(err({ ...base, existing: { lots: 0, avgPrice: 700 } }).code).toBe(
      'INVALID_EXISTING_POSITION',
    );
    expect(err({ ...base, existing: { lots: 1.5, avgPrice: 700 } }).code).toBe(
      'INVALID_EXISTING_POSITION',
    );
    expect(err({ ...base, existing: { lots: 3, avgPrice: 0 } }).code).toBe(
      'INVALID_EXISTING_POSITION',
    );
  });

  it('leaves averaging null when no position is supplied', () => {
    expect(ok(base).averaging).toBeNull();
    expect(ok({ ...base, existing: null }).averaging).toBeNull();
  });
});
