import { planInputSchema, type PlanInputDto } from '@mm/schemas';

/**
 * Share links encode the whole plan into the URL hash — no server, no shortener,
 * nothing stored. This is how the tool spreads: traders paste calculators at each
 * other, not signup pages.
 *
 * The hash is UNTRUSTED INPUT. It is validated with the same zod schema as the
 * form and never interpolated into markup; a malformed hash loads the default
 * state rather than throwing.
 */

const PREFIX = '#p=';

interface Compact {
  t: string | null;
  e: number[];
  s: number;
  r: number;
  bf: number;
  sf: number;
  b: number;
  tp: number | null;
  x: { l: number; a: number } | null;
}

/** UTF-8 safe base64 without the deprecated escape/unescape pair. */
function toBase64(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePlan(input: PlanInputDto): string {
  const compact: Compact = {
    t: input.ticker,
    e: input.entries,
    s: input.stopLoss,
    r: input.riskPercent,
    bf: input.buyFeePercent,
    sf: input.sellFeePercent,
    b: input.balance,
    tp: input.takeProfit,
    x: input.existing ? { l: input.existing.lots, a: input.existing.avgPrice } : null,
  };
  // base64 then encodeURIComponent keeps the payload safe in a URL fragment and
  // survives round-tripping through chat apps that mangle raw JSON.
  return PREFIX + encodeURIComponent(toBase64(JSON.stringify(compact)));
}

export function decodePlan(hash: string): PlanInputDto | null {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    const b64 = decodeURIComponent(hash.slice(PREFIX.length));
    const raw = JSON.parse(fromBase64(b64)) as Partial<Compact>;
    const candidate = {
      ticker: raw.t ?? null,
      entries: raw.e ?? [],
      stopLoss: raw.s,
      riskPercent: raw.r,
      buyFeePercent: raw.bf,
      sellFeePercent: raw.sf,
      balance: raw.b,
      takeProfit: raw.tp ?? null,
      existing: raw.x ? { lots: raw.x.l, avgPrice: raw.x.a } : null,
    };
    const parsed = planInputSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
