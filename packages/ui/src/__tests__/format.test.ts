import { describe, expect, it } from 'vitest';
import {
  digitsOnly,
  expandShorthand,
  formatDecimal,
  formatGrouped,
  formatPercent,
  formatRatio,
  formatRupiah,
  formatSignedRupiah,
  parseNumericInput,
} from '../format.js';

describe('id-ID formatting', () => {
  it('groups thousands with dots', () => {
    expect(formatGrouped(10_000_000)).toBe('10.000.000');
    expect(formatGrouped(1000)).toBe('1.000');
    expect(formatGrouped(0)).toBe('0');
  });

  it('uses a comma as the decimal mark', () => {
    expect(formatDecimal(733.33, 1)).toBe('733,3');
    expect(formatPercent(0.6)).toBe('0,6%');
  });

  it('prefixes rupiah and uses a real minus sign for negatives', () => {
    expect(formatRupiah(220_000)).toBe('Rp 220.000');
    // U+2212, not a hyphen
    expect(formatRupiah(-40_000)).toBe('−Rp 40.000');
    expect(formatRupiah(-40_000).charCodeAt(0)).toBe(0x2212);
  });

  it('pairs direction with a glyph so colour is never the only signal', () => {
    expect(formatSignedRupiah(1000)).toBe('▲ Rp 1.000');
    expect(formatSignedRupiah(-1000)).toBe('▼ Rp 1.000');
    expect(formatSignedRupiah(0)).toBe('Rp 0');
  });

  it('formats a risk:reward ratio and degrades to an em dash', () => {
    expect(formatRatio(2.44)).toBe('1 : 2,4');
    expect(formatRatio(null)).toBe('—');
    expect(formatRatio(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('parseNumericInput', () => {
  it('accepts what people actually paste', () => {
    expect(parseNumericInput('Rp 10.000.000')).toBe(10_000_000);
    expect(parseNumericInput('10,000,000')).toBe(10_000_000);
    expect(parseNumericInput('10 000 000')).toBe(10_000_000);
    expect(parseNumericInput('10000000')).toBe(10_000_000);
  });

  it('keeps empty as null, never 0', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('   ')).toBeNull();
    expect(parseNumericInput('Rp')).toBeNull();
  });

  it('treats a typed zero as the value zero', () => {
    expect(parseNumericInput('0')).toBe(0);
  });

  it('collapses leading zeros', () => {
    expect(parseNumericInput('007')).toBe(7);
  });

  it('strips non-digits', () => {
    expect(digitsOnly('Rp 1.000')).toBe('1000');
  });
});

describe('expandShorthand', () => {
  it('expands the units people type in a balance field', () => {
    expect(expandShorthand('10jt')).toBe(10_000_000);
    expect(expandShorthand('10 JT')).toBe(10_000_000);
    expect(expandShorthand('500rb')).toBe(500_000);
    expect(expandShorthand('2m')).toBe(2_000_000_000);
    expect(expandShorthand('5k')).toBe(5_000);
  });

  it('leaves a plain number alone', () => {
    expect(expandShorthand('10.000.000')).toBe(10_000_000);
    expect(expandShorthand('')).toBeNull();
  });
});
