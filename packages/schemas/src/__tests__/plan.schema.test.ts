import { describe, expect, it } from 'vitest';
import { planInputSchema } from '../plan.schema.js';
import { planStoreSchema, prefsSchema, savedPlanSchema } from '../storage.schema.js';
import { tickerFileSchema } from '../ticker.schema.js';

const valid = {
  ticker: 'BREN',
  entries: [1000, 900, 800, 700],
  stopLoss: 600,
  riskPercent: 1,
  buyFeePercent: 0.4,
  sellFeePercent: 0.5,
  balance: 10_000_000,
  takeProfit: 1400,
  existing: null,
};

/** Every rule asserted in BOTH directions — accepted and rejected. */
describe('planInputSchema', () => {
  it('accepts a well-formed plan', () => {
    const r = planInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('uppercases and trims the ticker', () => {
    const r = planInputSchema.parse({ ...valid, ticker: '  bren ' });
    expect(r.ticker).toBe('BREN');
  });

  it('accepts a null ticker — the calculator works without one', () => {
    expect(planInputSchema.safeParse({ ...valid, ticker: null }).success).toBe(true);
  });

  it('rejects an empty ladder and one past the cap', () => {
    expect(planInputSchema.safeParse({ ...valid, entries: [] }).success).toBe(false);
    const tooMany = Array.from({ length: 21 }, (_, i) => 1000 + i * 5);
    expect(planInputSchema.safeParse({ ...valid, entries: tooMany }).success).toBe(false);
  });

  it('accepts exactly 1 and exactly 20 entries', () => {
    expect(planInputSchema.safeParse({ ...valid, entries: [800] }).success).toBe(true);
    const twenty = Array.from({ length: 20 }, (_, i) => 1000 + i * 5);
    expect(planInputSchema.safeParse({ ...valid, entries: twenty, takeProfit: 2000 }).success).toBe(
      true,
    );
  });

  it('rejects a non-integer or non-positive price', () => {
    expect(planInputSchema.safeParse({ ...valid, entries: [1000.5] }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...valid, entries: [0] }).success).toBe(false);
  });

  it('rejects a stop at or above any entry, attaching the error to stopLoss', () => {
    const r = planInputSchema.safeParse({ ...valid, stopLoss: 800 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === 'stopLoss')).toBe(true);
    }
  });

  it('rejects duplicate entries', () => {
    const r = planInputSchema.safeParse({ ...valid, entries: [800, 800] });
    expect(r.success).toBe(false);
  });

  it('enforces the balance floor and ceiling', () => {
    expect(planInputSchema.safeParse({ ...valid, balance: 99_999 }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...valid, balance: 100_000 }).success).toBe(true);
    expect(planInputSchema.safeParse({ ...valid, balance: 1_000_000_000_001 }).success).toBe(false);
  });

  it('enforces the risk range at both edges', () => {
    expect(planInputSchema.safeParse({ ...valid, riskPercent: 0.09 }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...valid, riskPercent: 0.1 }).success).toBe(true);
    expect(planInputSchema.safeParse({ ...valid, riskPercent: 10 }).success).toBe(true);
    expect(planInputSchema.safeParse({ ...valid, riskPercent: 10.1 }).success).toBe(false);
  });

  it('enforces the fee ranges at both edges', () => {
    expect(planInputSchema.safeParse({ ...valid, buyFeePercent: 0 }).success).toBe(true);
    expect(planInputSchema.safeParse({ ...valid, buyFeePercent: 1 }).success).toBe(true);
    expect(planInputSchema.safeParse({ ...valid, buyFeePercent: 1.01 }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...valid, sellFeePercent: 1.5 }).success).toBe(true);
    expect(planInputSchema.safeParse({ ...valid, sellFeePercent: 1.6 }).success).toBe(false);
  });

  it('requires the take profit to sit above the highest entry, or be null', () => {
    expect(planInputSchema.safeParse({ ...valid, takeProfit: 1000 }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...valid, takeProfit: 1001 }).success).toBe(true);
    expect(planInputSchema.safeParse({ ...valid, takeProfit: null }).success).toBe(true);
  });

  it('rejects a ladder straddling the existing average', () => {
    const straddle = {
      ...valid,
      entries: [700, 800],
      existing: { lots: 3, avgPrice: 750 },
    };
    expect(planInputSchema.safeParse(straddle).success).toBe(false);
  });

  it('accepts a ladder entirely below, and entirely above, the existing average', () => {
    expect(
      planInputSchema.safeParse({
        ...valid,
        entries: [700, 650],
        existing: { lots: 3, avgPrice: 800 },
      }).success,
    ).toBe(true);
    expect(
      planInputSchema.safeParse({
        ...valid,
        entries: [900, 950],
        existing: { lots: 3, avgPrice: 800 },
      }).success,
    ).toBe(true);
  });

  it('rejects a malformed existing position', () => {
    expect(
      planInputSchema.safeParse({ ...valid, existing: { lots: 0, avgPrice: 800 } }).success,
    ).toBe(false);
    expect(
      planInputSchema.safeParse({ ...valid, existing: { lots: 1.5, avgPrice: 800 } }).success,
    ).toBe(false);
  });
});

describe('storage schemas', () => {
  const plan = {
    id: 'abc',
    ticker: 'BREN',
    name: 'BREN 23 Jul',
    status: 'draft' as const,
    input: valid,
    existing: null,
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
  };

  it('round-trips a saved plan', () => {
    expect(savedPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(savedPlanSchema.safeParse({ ...plan, status: 'archived' }).success).toBe(false);
  });

  it('accepts the current store version and rejects any other', () => {
    expect(planStoreSchema.safeParse({ version: 1, plans: [plan] }).success).toBe(true);
    // A future version must be treated as corrupt, not parsed optimistically.
    expect(planStoreSchema.safeParse({ version: 2, plans: [plan] }).success).toBe(false);
  });

  it('rejects a store whose plans are invalid', () => {
    expect(
      planStoreSchema.safeParse({ version: 1, plans: [{ ...plan, input: { ...valid, balance: 1 } }] })
        .success,
    ).toBe(false);
  });

  it('applies preference defaults', () => {
    const p = prefsSchema.parse({ version: 1 });
    expect(p.theme).toBe('light');
    expect(p.recentTickers).toEqual([]);
  });

  it('caps the recent-ticker list', () => {
    expect(
      prefsSchema.safeParse({ version: 1, recentTickers: ['A', 'B', 'C', 'D', 'E', 'F'] }).success,
    ).toBe(false);
  });
});

describe('tickerFileSchema', () => {
  it('accepts the bundled shape and defaults optional fields', () => {
    const r = tickerFileSchema.parse({
      updatedAt: '2026-07-23',
      count: 1,
      tickers: [{ code: 'BREN', name: 'Barito Renewables Energy Tbk.' }],
    });
    expect(r.tickers[0]!.sector).toBe('');
    expect(r.tickers[0]!.delisted).toBe(false);
  });

  it('rejects a ticker with no code', () => {
    expect(
      tickerFileSchema.safeParse({
        updatedAt: '2026-07-23',
        count: 1,
        tickers: [{ code: '', name: 'x' }],
      }).success,
    ).toBe(false);
  });
});
