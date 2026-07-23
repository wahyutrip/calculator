import { tickerFileSchema, type Ticker } from '@mm/schemas';

let cache: Ticker[] | null = null;
let inflight: Promise<Ticker[]> | null = null;

/**
 * The IDX list is bundled as a static asset and precached by the service worker,
 * so this resolves offline after first load. Under 1000 entries, so it is held in
 * memory and searched linearly — an index would be premature.
 */
export async function loadTickers(): Promise<Ticker[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch('/data/idx-tickers.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((json): Ticker[] => {
      const parsed = tickerFileSchema.safeParse(json);
      // A malformed file must not take the calculator down — the ticker is
      // optional and the tool works without one.
      const list: Ticker[] = parsed.success ? parsed.data.tickers : [];
      cache = list;
      return list;
    })
    .catch((): Ticker[] => {
      cache = [];
      return [];
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Subsequence match, used only as the last-resort rank tier. */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack.charAt(j) === needle.charAt(i)) i += 1;
  }
  return i === needle.length;
}

/**
 * Rank tiers matter more than fuzziness on a four-letter-code market: typing
 * "BR" must put BREN and BRIS above "Sumber Alfaria". A matcher that ignores
 * field priority feels broken here.
 */
export function searchTickers(all: Ticker[], query: string, limit = 8): Ticker[] {
  const q = fold(query.trim());
  if (!q) return [];

  const scored: Array<{ t: Ticker; rank: number }> = [];
  for (const t of all) {
    if (t.delisted) continue; // hidden from search, still resolvable by code
    const code = fold(t.code);
    const name = fold(t.name);

    let rank = -1;
    if (code === q) rank = 0;
    else if (code.startsWith(q)) rank = 1;
    else if (name.startsWith(q)) rank = 2;
    else if (name.includes(q)) rank = 3;
    else if (isSubsequence(q, code)) rank = 4;

    if (rank >= 0) scored.push({ t, rank });
  }

  scored.sort((a, b) => a.rank - b.rank || a.t.code.localeCompare(b.t.code));
  return scored.slice(0, limit).map((s) => s.t);
}

/** Saved plans must keep rendering even when their ticker has been delisted. */
export function findTicker(all: Ticker[], code: string | null): Ticker | null {
  if (!code) return null;
  return all.find((t) => t.code === code.toUpperCase()) ?? null;
}
