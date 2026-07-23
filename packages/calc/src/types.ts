/** Public types for the sizing engine. No runtime code lives here. */

export interface ExistingPosition {
  /** Whole lots already held. */
  lots: number;
  /** Price actually paid per share. */
  avgPrice: number;
}

export interface PlanInput {
  entries: number[];
  stopLoss: number;
  riskPercent: number;
  buyFeePercent: number;
  sellFeePercent: number;
  balance: number;
  takeProfit?: number | null;
  existing?: ExistingPosition | null;
}

export interface EntryRow {
  /** 1-based ladder position, as labelled in the UI ("Buy 3"). */
  index: number;
  entry: number;
  stopLoss: number;
  /** Fractional ideal share count before whole-lot rounding. */
  sharesPlanned: number;
  valuePlanned: number;
  /** Percent of balance, truncated to 1dp — the "%m" column. */
  pctOfModal: number;
  lots: number;
  sharesActual: number;
  valueActual: number;
}

export interface SideSummary {
  shares: number;
  lots: number;
  totalValue: number;
  averagePrice: number;
  lossAtStop: number;
  lossPercentOfBalance: number;
  profitAtTarget: number | null;
  riskReward: number | null;
}

export type WarningCode =
  | 'NO_FULL_LOT'
  | 'RISK_UNDERUSED'
  | 'OVER_ALLOCATED'
  | 'RISK_SPREAD_THIN';

export interface CalcWarning {
  code: WarningCode;
  /** Values the UI interpolates into localised copy. The engine emits no strings. */
  values: Record<string, number>;
}

export interface BlendedPosition {
  lots: number;
  shares: number;
  averagePrice: number;
  totalValue: number;
  lossAtStop: number;
  breakEven: number;
  /** True when the whole blended position exits at or above cost at the stop. */
  riskFree: boolean;
}

export interface AveragingResult {
  mode: 'down' | 'up';
  /** True when the existing position already consumes the entire risk budget. */
  blocked: boolean;
  existingRisk: number;
  headroom: number;
  before: BlendedPosition;
  after: BlendedPosition;
}

export interface PlanOutput {
  rows: EntryRow[];
  riskBudget: number;
  riskPerEntry: number;
  /** Sum of the truncated row values, not the truncation of the true sum. */
  totalPctOfModal: number;
  planned: SideSummary;
  actual: SideSummary;
  warnings: CalcWarning[];
  averaging: AveragingResult | null;
}

export type CalcErrorCode =
  | 'NO_ENTRIES'
  | 'TOO_MANY_ENTRIES'
  | 'ENTRY_NOT_ABOVE_STOP'
  | 'INVALID_STOP'
  | 'BALANCE_TOO_SMALL'
  | 'BALANCE_TOO_LARGE'
  | 'INVALID_RISK'
  | 'INVALID_FEE'
  | 'INVALID_TAKE_PROFIT'
  | 'DUPLICATE_ENTRY'
  | 'INVALID_EXISTING_POSITION'
  | 'MIXED_AVERAGING_LADDER';

export interface CalcError {
  code: CalcErrorCode;
  values: Record<string, number>;
}

export type CalcResult = { ok: true; data: PlanOutput } | { ok: false; error: CalcError };
