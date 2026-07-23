import { prefsSchema, type PrefsDto } from '@mm/schemas';

export const PREFS_KEY = 'mm:prefs:v1';

const DEFAULTS: PrefsDto = {
  version: 1,
  theme: 'light',
  recentTickers: [],
  lastRiskPercent: null,
  lastBuyFeePercent: null,
};

export function readPrefs(): PrefsDto {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = prefsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function writePrefs(next: Partial<PrefsDto>): void {
  if (typeof window === 'undefined') return;
  try {
    const merged = prefsSchema.parse({ ...readPrefs(), ...next });
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  } catch {
    // Preferences are a convenience; failing to persist them must never break a
    // calculation the user is in the middle of.
  }
}

export function pushRecentTicker(code: string): void {
  const prefs = readPrefs();
  const next = [code, ...prefs.recentTickers.filter((c: string) => c !== code)].slice(0, 5);
  writePrefs({ recentTickers: next });
}
