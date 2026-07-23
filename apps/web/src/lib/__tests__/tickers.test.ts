import type { Ticker } from '@mm/schemas';
import { describe, expect, it } from 'vitest';
import { findTicker, searchTickers } from '../tickers';

const all: Ticker[] = [
  { code: 'BREN', name: 'Barito Renewables Energy Tbk.', sector: '', board: '', delisted: false },
  { code: 'BRIS', name: 'Bank Syariah Indonesia Tbk.', sector: '', board: '', delisted: false },
  { code: 'BRPT', name: 'Barito Pacific Tbk.', sector: '', board: '', delisted: false },
  { code: 'AMRT', name: 'Sumber Alfaria Trijaya Tbk.', sector: '', board: '', delisted: false },
  { code: 'GONE', name: 'Delisted Company Tbk.', sector: '', board: '', delisted: true },
];

describe('searchTickers', () => {
  it('ranks an exact code match first', () => {
    expect(searchTickers(all, 'BRIS')[0]!.code).toBe('BRIS');
  });

  it('puts code prefixes above name matches', () => {
    // "BR" must surface BREN/BRIS/BRPT before "Sumber Alfaria" — a matcher that
    // ignores field priority feels broken on a four-letter-code market.
    const codes = searchTickers(all, 'BR').map((t) => t.code);
    expect(codes.slice(0, 3).sort()).toEqual(['BREN', 'BRIS', 'BRPT']);
    expect(codes).not.toContain('AMRT');
  });

  it('matches on company name', () => {
    expect(searchTickers(all, 'alfaria').map((t) => t.code)).toContain('AMRT');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(searchTickers(all, '  bren ')[0]!.code).toBe('BREN');
    expect(searchTickers(all, 'BrEn')[0]!.code).toBe('BREN');
  });

  it('falls back to a subsequence match, ranked last', () => {
    expect(searchTickers(all, 'brn').map((t) => t.code)).toContain('BREN');
  });

  it('returns nothing for an empty query — recents are the caller’s job', () => {
    expect(searchTickers(all, '')).toEqual([]);
    expect(searchTickers(all, '   ')).toEqual([]);
  });

  it('hides delisted tickers from search', () => {
    expect(searchTickers(all, 'GONE')).toEqual([]);
  });

  it('respects the result limit', () => {
    expect(searchTickers(all, 'b', 2)).toHaveLength(2);
  });
});

describe('findTicker', () => {
  it('resolves by code, case-insensitively', () => {
    expect(findTicker(all, 'bren')?.code).toBe('BREN');
  });

  it('still resolves a delisted ticker so saved plans keep their name', () => {
    expect(findTicker(all, 'GONE')?.name).toBe('Delisted Company Tbk.');
  });

  it('returns null for an unknown or absent code', () => {
    expect(findTicker(all, 'ZZZZ')).toBeNull();
    expect(findTicker(all, null)).toBeNull();
  });
});
