/** IDX market constants and the presets the UI offers. */

/** One lot is 100 shares (lembar) on IDX. Not configurable. */
export const LOT_SIZE = 100;

/** Ladder bounds. See specs/features/calculator.md §2.1 for why 20. */
export const MIN_ENTRIES = 1;
export const MAX_ENTRIES = 20;

export const MIN_BALANCE = 100_000;
export const MAX_BALANCE = 1_000_000_000_000;

export const MIN_RISK_PERCENT = 0.1;
export const MAX_RISK_PERCENT = 10;

export const MIN_FEE_PERCENT = 0;
export const MAX_BUY_FEE_PERCENT = 1;
export const MAX_SELL_FEE_PERCENT = 1.5;

/**
 * IDX charges a 0.1% PPh final on sale proceeds on top of the broker fee, so the
 * sell fee defaults to the buy fee plus this.
 */
export const SELL_TAX_PERCENT = 0.1;

export interface RiskPreset {
  readonly value: number;
  readonly label: string;
}

/**
 * Values and labels are exactly those of the reference tool. "Aggresive" is
 * misspelled there; we match it deliberately, because users recognise the string
 * and a silent correction makes our preset look like a different option.
 */
export const RISK_PRESETS: readonly RiskPreset[] = [
  { value: 0.5, label: 'Defensive' },
  { value: 1.0, label: 'Standard' },
  { value: 1.5, label: 'Optimistic' },
  { value: 2.0, label: 'Aggresive' },
  { value: 2.5, label: 'Risky' },
  { value: 3.0, label: 'Medium Risk' },
  { value: 3.5, label: 'High Risk' },
  { value: 4.0, label: 'Extreme Risk' },
  { value: 4.5, label: 'Gamble' },
  { value: 5.0, label: 'Dangerous' },
] as const;

export const DEFAULT_RISK_PERCENT = 1.0;

export const FEE_PRESETS: readonly number[] = [
  0, 0.2, 0.3, 0.33, 0.36, 0.4, 0.44, 0.46, 0.48, 0.5,
] as const;

export const DEFAULT_BUY_FEE_PERCENT = 0.4;
