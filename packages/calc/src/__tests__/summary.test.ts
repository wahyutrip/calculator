import { describe, expect, it } from 'vitest';
import { summarise } from '../summary.js';

/**
 * summarise() is guarded independently of calculate(). calculate() validates the
 * balance upstream, so these defensive paths are unreachable through it — which is
 * exactly why they are exercised here directly rather than left unproven.
 */
describe('summarise', () => {
  const base = {
    shares: 300,
    totalValue: 220_000,
    lossAtStop: 40_000,
    balance: 10_000_000,
    takeProfit: 1400,
    buyFee: 0.004,
    sellFee: 0.005,
  };

  it('computes the average, loss percentage and fee-aware profit', () => {
    const s = summarise(base);
    expect(s.averagePrice).toBeCloseTo(733.33, 2);
    expect(s.lots).toBe(3);
    expect(s.lossPercentOfBalance).toBeCloseTo(0.4, 6);
    expect(s.profitAtTarget).toBeCloseTo(300 * 1400 * 0.995 - 220_000 * 1.004, 6);
  });

  it('returns 0 rather than NaN when the balance is 0', () => {
    const s = summarise({ ...base, balance: 0 });
    expect(s.lossPercentOfBalance).toBe(0);
    expect(Number.isFinite(s.lossPercentOfBalance)).toBe(true);
  });

  it('returns a 0 average rather than NaN for an empty position', () => {
    const s = summarise({ ...base, shares: 0, totalValue: 0, lossAtStop: 0 });
    expect(s.averagePrice).toBe(0);
    expect(s.profitAtTarget).toBeNull();
    expect(s.riskReward).toBeNull();
  });

  it('omits risk:reward when there is no loss to divide by', () => {
    const s = summarise({ ...base, lossAtStop: 0 });
    expect(s.profitAtTarget).not.toBeNull();
    expect(s.riskReward).toBeNull();
  });
});
