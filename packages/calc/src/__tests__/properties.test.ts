import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculate } from '../size.js';
import { LOT_SIZE, MAX_ENTRIES } from '../constants.js';
import type { PlanInput } from '../types.js';

/**
 * Examples cannot cover an unlimited ladder. These properties can.
 */

/** A ladder of distinct prices strictly above the stop. */
const planArb = fc
  .record({
    stopLoss: fc.integer({ min: 50, max: 3000 }),
    gaps: fc.array(fc.integer({ min: 1, max: 2000 }), { minLength: 1, maxLength: MAX_ENTRIES }),
    riskPercent: fc.double({ min: 0.1, max: 10, noNaN: true }),
    buyFeePercent: fc.double({ min: 0, max: 1, noNaN: true }),
    balance: fc.integer({ min: 100_000, max: 100_000_000_000 }),
  })
  .map(({ stopLoss, gaps, riskPercent, buyFeePercent, balance }): PlanInput => {
    // Distinct, strictly increasing entries above the stop.
    const entries: number[] = [];
    let p = stopLoss;
    for (const g of gaps) {
      p += g;
      entries.push(p);
    }
    return {
      entries,
      stopLoss,
      riskPercent,
      buyFeePercent,
      sellFeePercent: Math.min(buyFeePercent + 0.1, 1.5),
      balance,
      takeProfit: null,
    };
  });

describe('properties', () => {
  it('never emits NaN or Infinity for any valid input', () => {
    fc.assert(
      fc.property(planArb, (input) => {
        const r = calculate(input);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const nums: number[] = [
          r.data.riskBudget,
          r.data.riskPerEntry,
          r.data.totalPctOfModal,
          ...r.data.rows.flatMap((row) => [
            row.sharesPlanned,
            row.valuePlanned,
            row.pctOfModal,
            row.lots,
            row.sharesActual,
            row.valueActual,
          ]),
          r.data.planned.averagePrice,
          r.data.planned.lossAtStop,
          r.data.actual.averagePrice,
          r.data.actual.lossAtStop,
        ];
        for (const n of nums) expect(Number.isFinite(n)).toBe(true);
      }),
      { numRuns: 400 },
    );
  });

  it('total planned risk always equals the risk budget', () => {
    fc.assert(
      fc.property(planArb, (input) => {
        const r = calculate(input);
        if (!r.ok) return;
        expect(r.data.planned.lossAtStop).toBeCloseTo(r.data.riskBudget, 4);
      }),
      { numRuns: 400 },
    );
  });

  it('lot counts are never negative and are whole numbers', () => {
    fc.assert(
      fc.property(planArb, (input) => {
        const r = calculate(input);
        if (!r.ok) return;
        for (const row of r.data.rows) {
          expect(row.lots).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(row.lots)).toBe(true);
          expect(row.sharesActual).toBe(row.lots * LOT_SIZE);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('actual loss never exceeds planned loss — the engine never over-commits risk', () => {
    fc.assert(
      fc.property(planArb, (input) => {
        const r = calculate(input);
        if (!r.ok) return;
        // Whole-lot flooring can only ever reduce exposure.
        expect(r.data.actual.lossAtStop).toBeLessThanOrEqual(r.data.planned.lossAtStop + 1e-6);
      }),
      { numRuns: 400 },
    );
  });

  it('truncated %m never exceeds the exact value', () => {
    fc.assert(
      fc.property(planArb, (input) => {
        const r = calculate(input);
        if (!r.ok) return;
        for (const row of r.data.rows) {
          const exact = (row.valuePlanned / input.balance) * 100;
          expect(row.pctOfModal).toBeLessThanOrEqual(exact + 1e-9);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('an entry nearer the stop is sized larger — monotonic in distance to stop', () => {
    fc.assert(
      fc.property(planArb, (input) => {
        const r = calculate(input);
        if (!r.ok) return;
        const rows = [...r.data.rows].sort((a, b) => a.entry - b.entry);
        for (let i = 1; i < rows.length; i++) {
          // Entries are sorted ascending, so each is further from the stop than
          // the last, and must therefore be sized with no more shares.
          expect(rows[i]!.sharesPlanned).toBeLessThanOrEqual(rows[i - 1]!.sharesPlanned + 1e-9);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('actual position value never exceeds planned position value', () => {
    fc.assert(
      fc.property(planArb, (input) => {
        const r = calculate(input);
        if (!r.ok) return;
        expect(r.data.actual.totalValue).toBeLessThanOrEqual(r.data.planned.totalValue + 1e-6);
      }),
      { numRuns: 300 },
    );
  });
});
