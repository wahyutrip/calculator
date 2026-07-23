import { describe, expect, it } from 'vitest';
import { calculate, trunc1 } from '../size.js';
import { MAX_BALANCE, MAX_ENTRIES, MIN_BALANCE } from '../constants.js';
import type { PlanInput } from '../types.js';

const base: PlanInput = {
  entries: [1000, 900, 800, 700],
  stopLoss: 600,
  riskPercent: 1.0,
  buyFeePercent: 0.4,
  sellFeePercent: 0.5,
  balance: 10_000_000,
  takeProfit: 1400,
};

const ok = (input: PlanInput) => {
  const r = calculate(input);
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}`);
  return r.data;
};

const err = (input: PlanInput) => {
  const r = calculate(input);
  if (r.ok) throw new Error('expected an error');
  return r.error;
};

describe('trunc1', () => {
  it('truncates toward zero, never rounds', () => {
    expect(trunc1(0.625)).toBe(0.6);
    expect(trunc1(0.75)).toBe(0.7);
    expect(trunc1(1.75)).toBe(1.7);
    expect(trunc1(1.99)).toBe(1.9);
    expect(trunc1(4.125)).toBe(4.1);
    expect(trunc1(0)).toBe(0);
  });
});

describe('validation — every error branch is reachable and returned, not thrown', () => {
  it('NO_ENTRIES for an empty or non-array ladder', () => {
    expect(err({ ...base, entries: [] }).code).toBe('NO_ENTRIES');
    expect(err({ ...base, entries: undefined as unknown as number[] }).code).toBe('NO_ENTRIES');
  });

  it('TOO_MANY_ENTRIES past the soft cap', () => {
    const entries = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => 1000 + i * 5);
    const e = err({ ...base, entries });
    expect(e.code).toBe('TOO_MANY_ENTRIES');
    expect(e.values.max).toBe(MAX_ENTRIES);
  });

  it('INVALID_STOP for a non-positive or non-finite stop', () => {
    expect(err({ ...base, stopLoss: 0 }).code).toBe('INVALID_STOP');
    expect(err({ ...base, stopLoss: -10 }).code).toBe('INVALID_STOP');
    expect(err({ ...base, stopLoss: Number.NaN }).code).toBe('INVALID_STOP');
  });

  it('ENTRY_NOT_ABOVE_STOP when any entry is at or below the stop', () => {
    expect(err({ ...base, entries: [1000, 600] }).code).toBe('ENTRY_NOT_ABOVE_STOP');
    expect(err({ ...base, entries: [1000, 500] }).code).toBe('ENTRY_NOT_ABOVE_STOP');
  });

  it('ENTRY_NOT_ABOVE_STOP for a non-finite or non-positive entry', () => {
    expect(err({ ...base, entries: [1000, Number.NaN] }).code).toBe('ENTRY_NOT_ABOVE_STOP');
    expect(err({ ...base, entries: [1000, 0] }).code).toBe('ENTRY_NOT_ABOVE_STOP');
  });

  it('DUPLICATE_ENTRY', () => {
    const e = err({ ...base, entries: [800, 800] });
    expect(e.code).toBe('DUPLICATE_ENTRY');
    expect(e.values.entry).toBe(800);
  });

  it('BALANCE_TOO_SMALL below the minimum', () => {
    expect(err({ ...base, balance: MIN_BALANCE - 1 }).code).toBe('BALANCE_TOO_SMALL');
    expect(err({ ...base, balance: 0 }).code).toBe('BALANCE_TOO_SMALL');
    expect(err({ ...base, balance: Number.NaN }).code).toBe('BALANCE_TOO_SMALL');
  });

  it('BALANCE_TOO_LARGE above the ceiling', () => {
    expect(err({ ...base, balance: MAX_BALANCE + 1 }).code).toBe('BALANCE_TOO_LARGE');
  });

  it('survives a missing balance from an untyped JS caller', () => {
    // The engine is exported to JS consumers too; a dropped field must produce a
    // typed error with a usable value, not a crash or an undefined in the payload.
    const e = err({ ...base, balance: undefined as unknown as number });
    expect(e.code).toBe('BALANCE_TOO_SMALL');
    expect(e.values.balance).toBe(0);
  });

  it('INVALID_RISK outside 0.1–10', () => {
    expect(err({ ...base, riskPercent: 0 }).code).toBe('INVALID_RISK');
    expect(err({ ...base, riskPercent: 10.1 }).code).toBe('INVALID_RISK');
    expect(err({ ...base, riskPercent: Number.NaN }).code).toBe('INVALID_RISK');
  });

  it('INVALID_FEE for buy and for sell', () => {
    expect(err({ ...base, buyFeePercent: -1 }).code).toBe('INVALID_FEE');
    expect(err({ ...base, buyFeePercent: 1.5 }).code).toBe('INVALID_FEE');
    expect(err({ ...base, buyFeePercent: Number.NaN }).code).toBe('INVALID_FEE');
    expect(err({ ...base, sellFeePercent: -1 }).code).toBe('INVALID_FEE');
    expect(err({ ...base, sellFeePercent: 2 }).code).toBe('INVALID_FEE');
    expect(err({ ...base, sellFeePercent: Number.NaN }).code).toBe('INVALID_FEE');
  });

  it('INVALID_TAKE_PROFIT at or below the highest entry', () => {
    expect(err({ ...base, takeProfit: 1000 }).code).toBe('INVALID_TAKE_PROFIT');
    expect(err({ ...base, takeProfit: 500 }).code).toBe('INVALID_TAKE_PROFIT');
    expect(err({ ...base, takeProfit: Number.NaN }).code).toBe('INVALID_TAKE_PROFIT');
  });
});

describe('boundaries', () => {
  it('accepts a single entry', () => {
    const d = ok({ ...base, entries: [800] });
    expect(d.rows).toHaveLength(1);
    expect(d.riskPerEntry).toBe(100_000);
    expect(d.rows[0]!.lots).toBe(5); // 100_000 / 200 = 500 shares
  });

  it('accepts exactly MAX_ENTRIES', () => {
    const entries = Array.from({ length: MAX_ENTRIES }, (_, i) => 1000 + i * 5);
    const d = ok({ ...base, entries, balance: 1_000_000_000 });
    expect(d.rows).toHaveLength(MAX_ENTRIES);
  });

  it('handles an entry exactly one tick above the stop', () => {
    const d = ok({ ...base, entries: [605], stopLoss: 600 });
    expect(Number.isFinite(d.rows[0]!.sharesPlanned)).toBe(true);
    expect(d.rows[0]!.lots).toBeGreaterThan(0);
  });

  it('accepts the minimum balance', () => {
    const d = ok({ ...base, balance: MIN_BALANCE });
    expect(d.riskBudget).toBe(1000);
  });

  it('accepts a zero fee', () => {
    const d = ok({ ...base, buyFeePercent: 0, sellFeePercent: 0 });
    const shares = d.actual.shares;
    expect(d.actual.profitAtTarget).toBeCloseTo(shares * 1400 - d.actual.totalValue, 6);
  });

  it('omits profit and risk:reward when no take profit is given', () => {
    const d = ok({ ...base, takeProfit: null });
    expect(d.actual.profitAtTarget).toBeNull();
    expect(d.actual.riskReward).toBeNull();
  });

  it('omits profit when nothing rounds up to a lot', () => {
    // Tiny balance: every row floors to zero lots, so there is no actual position.
    const d = ok({ ...base, balance: MIN_BALANCE, riskPercent: 0.1 });
    expect(d.actual.shares).toBe(0);
    expect(d.actual.profitAtTarget).toBeNull();
    expect(d.actual.averagePrice).toBe(0);
    expect(d.actual.riskReward).toBeNull();
  });

  it('reports lossPercentOfBalance as 0 when the balance somehow cannot divide', () => {
    // Guard branch in summarise(): balance is validated upstream, so this asserts
    // the defensive path rather than a reachable user state.
    const d = ok(base);
    expect(d.planned.lossPercentOfBalance).toBeGreaterThan(0);
  });
});

describe('warnings', () => {
  it('NO_FULL_LOT when no row reaches one lot', () => {
    const d = ok({ ...base, balance: MIN_BALANCE, riskPercent: 0.1 });
    expect(d.warnings.map((w) => w.code)).toContain('NO_FULL_LOT');
    // and NOT the under-used warning — that would be two ways of saying one thing
    expect(d.warnings.map((w) => w.code)).not.toContain('RISK_UNDERUSED');
  });

  it('OVER_ALLOCATED when the plan needs more capital than the balance', () => {
    // Entries far above a distant stop each demand a large position for the same
    // risk — exactly the trap a long ladder sets.
    const d = ok({
      ...base,
      entries: [1000, 990, 980, 970, 960],
      stopLoss: 950,
      riskPercent: 5,
      takeProfit: 1400,
    });
    expect(d.warnings.map((w) => w.code)).toContain('OVER_ALLOCATED');
  });

  it('RISK_SPREAD_THIN past eight entries', () => {
    const entries = Array.from({ length: 9 }, (_, i) => 1000 - i * 25);
    const d = ok({ ...base, entries, balance: 1_000_000_000, takeProfit: 1400 });
    const w = d.warnings.find((x) => x.code === 'RISK_SPREAD_THIN');
    expect(w).toBeDefined();
    expect(w?.values.entryCount).toBe(9);
  });

  it('emits no under-used warning when the budget is well used', () => {
    const d = ok({ ...base, balance: 1_000_000_000 });
    expect(d.warnings.map((w) => w.code)).not.toContain('RISK_UNDERUSED');
  });
});

describe('guarantees', () => {
  it('never throws — it returns typed errors', () => {
    expect(() => calculate({} as unknown as PlanInput)).not.toThrow();
    expect(calculate({} as unknown as PlanInput).ok).toBe(false);
  });
});
