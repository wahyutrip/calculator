import type { PlanInputDto } from '@mm/schemas';
import { describe, expect, it } from 'vitest';
import { decodePlan, encodePlan } from '../share/url-hash';

const plan: PlanInputDto = {
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

describe('share links', () => {
  it('round-trips a plan exactly', () => {
    const decoded = decodePlan(encodePlan(plan));
    expect(decoded).toEqual(plan);
  });

  it('round-trips an averaging plan', () => {
    const withPosition: PlanInputDto = {
      ...plan,
      entries: [700, 650],
      existing: { lots: 3, avgPrice: 800 },
    };
    expect(decodePlan(encodePlan(withPosition))).toEqual(withPosition);
  });

  it('round-trips an unlimited ladder', () => {
    // Every rung must stay above the stop at 600, so step by 5 rather than 25.
    const long: PlanInputDto = {
      ...plan,
      entries: Array.from({ length: 20 }, (_, i) => 1000 - i * 5),
      takeProfit: 1400,
    };
    expect(decodePlan(encodePlan(long))?.entries).toHaveLength(20);
  });

  /*
   * The hash is untrusted input. Every one of these must return null and load
   * defaults rather than throwing or, worse, producing a half-valid plan.
   */
  it.each([
    ['not a hash', '#other=1'],
    ['empty', ''],
    ['garbage base64', '#p=!!!!'],
    ['valid base64, not JSON', '#p=aGVsbG8='],
    ['JSON that fails validation', `#p=${encodeURIComponent(btoa('{"e":[100],"s":900}'))}`],
  ])('rejects %s', (_label, hash) => {
    expect(decodePlan(hash)).toBeNull();
  });

  it('rejects a plan whose stop sits above its entries', () => {
    const hash = encodePlan(plan).replace(/#p=.*/, '');
    expect(decodePlan(hash)).toBeNull();
  });

  it('survives a hash carrying a script payload', () => {
    const evil = `#p=${encodeURIComponent(btoa('{"t":"<script>alert(1)</script>","e":[800],"s":600}'))}`;
    // Rejected by validation (missing required fields) rather than reaching the DOM.
    expect(decodePlan(evil)).toBeNull();
  });
});
