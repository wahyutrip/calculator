import { LOT_SIZE, calculate } from '@mm/calc';
import type { SavedPlanDto } from '@mm/schemas';
import { INITIAL_STATE, type FormState } from '@/hooks/useCalculator';

/** Restore a saved plan's inputs into form state. */
export function planToFormState(plan: SavedPlanDto): FormState {
  const i = plan.input;
  return {
    ...INITIAL_STATE,
    ticker: plan.ticker,
    entries: i.entries,
    stopLoss: i.stopLoss,
    riskPercent: i.riskPercent,
    buyFeePercent: i.buyFeePercent,
    sellFeePercent: i.sellFeePercent,
    sellFeeTouched: true,
    balance: i.balance,
    takeProfit: i.takeProfit,
    averagingEnabled: plan.existing !== null,
    existingLots: plan.existing?.lots ?? null,
    existingAvgPrice: plan.existing?.avgPrice ?? null,
  };
}

export interface PlanTotals {
  lots: number;
  totalValue: number;
  averagePrice: number;
  lossAtStop: number;
}

/**
 * Derived on read, never stored. A saved plan showing numbers the current engine
 * disagrees with is worse than no saved plan.
 */
export function planTotals(plan: SavedPlanDto): PlanTotals | null {
  const r = calculate(plan.input);
  if (!r.ok) return null;
  return {
    lots: r.data.actual.shares / LOT_SIZE,
    totalValue: r.data.actual.totalValue,
    averagePrice: r.data.actual.averagePrice,
    lossAtStop: r.data.actual.lossAtStop,
  };
}
