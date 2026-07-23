import type { CalcWarning, SideSummary } from './types.js';

export interface WarningInput {
  totalLots: number;
  riskBudget: number;
  balance: number;
  entryCount: number;
  planned: SideSummary;
  actual: SideSummary;
}

/**
 * Warnings carry codes and numbers, never strings — the engine has no locale and
 * must stay reusable from the API and the future mobile app.
 */
export function buildWarnings(input: WarningInput): CalcWarning[] {
  const { totalLots, riskBudget, balance, entryCount, planned, actual } = input;
  const warnings: CalcWarning[] = [];

  if (totalLots === 0) {
    warnings.push({ code: 'NO_FULL_LOT', values: { riskBudget } });
  } else if (actual.lossAtStop < riskBudget * 0.5) {
    // Whole-lot rounding can leave real exposure far below intent. Surfacing this
    // gap is the main thing this tool does that the reference tool does not.
    warnings.push({
      code: 'RISK_UNDERUSED',
      values: { actualLoss: actual.lossAtStop, riskBudget },
    });
  }

  if (planned.totalValue > balance) {
    // Far more likely with an unlimited ladder: entries well above the stop each
    // demand a large position for the same risk, so a long ladder can plan more
    // capital than exists.
    warnings.push({
      code: 'OVER_ALLOCATED',
      values: { required: planned.totalValue, balance },
    });
  }

  if (entryCount > 8) {
    warnings.push({
      code: 'RISK_SPREAD_THIN',
      values: { entryCount, percentEach: 100 / entryCount },
    });
  }

  return warnings;
}
