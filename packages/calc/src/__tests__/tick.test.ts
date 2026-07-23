import { describe, expect, it } from 'vitest';
import { isTickAligned, snapToTick, tickSize } from '../tick.js';

describe('tickSize — every band boundary', () => {
  it.each([
    [1, 1],
    [199, 1],
    [200, 2],
    [499, 2],
    [500, 5],
    [1999, 5],
    [2000, 10],
    [4999, 10],
    [5000, 25],
    [50000, 25],
  ])('price %i → tick %i', (price, expected) => {
    expect(tickSize(price)).toBe(expected);
  });
});

describe('snapToTick', () => {
  it('leaves an already-aligned price alone', () => {
    expect(snapToTick(1000)).toBe(1000);
    expect(snapToTick(199)).toBe(199);
    expect(snapToTick(5000)).toBe(5000);
  });

  it('snaps within the band', () => {
    expect(snapToTick(1002)).toBe(1000);
    expect(snapToTick(1003)).toBe(1005);
    expect(snapToTick(201)).toBe(202);
  });

  it('converges when rounding pushes the price into the next band', () => {
    // 1998 → tick 5 → 2000, which belongs to the tick-10 band. 2000 % 10 === 0,
    // so the fixed point holds after one extra step.
    expect(snapToTick(1998)).toBe(2000);
    expect(snapToTick(499)).toBe(500);
    expect(snapToTick(4999)).toBe(5000);
  });

  it('never returns below one tick', () => {
    expect(snapToTick(0.4)).toBe(1);
    expect(snapToTick(1)).toBe(1);
  });

  it('returns 0 for non-positive or non-finite input rather than throwing', () => {
    expect(snapToTick(0)).toBe(0);
    expect(snapToTick(-5)).toBe(0);
    expect(snapToTick(Number.NaN)).toBe(0);
    expect(snapToTick(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('always produces an aligned price', () => {
    for (let p = 1; p <= 6000; p += 7) {
      expect(isTickAligned(snapToTick(p))).toBe(true);
    }
  });
});

describe('isTickAligned', () => {
  it('accepts aligned integers', () => {
    expect(isTickAligned(1000)).toBe(true);
    expect(isTickAligned(202)).toBe(true);
  });

  it('rejects misaligned, fractional, zero, negative and non-finite prices', () => {
    expect(isTickAligned(1003)).toBe(false);
    expect(isTickAligned(1000.5)).toBe(false);
    expect(isTickAligned(0)).toBe(false);
    expect(isTickAligned(-100)).toBe(false);
    expect(isTickAligned(Number.NaN)).toBe(false);
    expect(isTickAligned(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
