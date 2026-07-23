import { LOT_SIZE } from './constants.js';
import type { SideSummary } from './types.js';

export interface SideInput {
  shares: number;
  totalValue: number;
  lossAtStop: number;
  balance: number;
  takeProfit: number | null;
  buyFee: number;
  sellFee: number;
}

/**
 * Profit is fee-aware on both sides. The naive version (shares × (TP − avg))
 * overstates by roughly 0.9% of turnover at default fees, which on a tight trade
 * is the difference between a small win and a small loss.
 */
export function summarise(input: SideInput): SideSummary {
  const { shares, totalValue, lossAtStop, balance, takeProfit, buyFee, sellFee } = input;

  const averagePrice = shares > 0 ? totalValue / shares : 0;

  let profitAtTarget: number | null = null;
  if (takeProfit !== null && shares > 0) {
    const grossBuy = totalValue * (1 + buyFee);
    const netSell = shares * takeProfit * (1 - sellFee);
    profitAtTarget = netSell - grossBuy;
  }

  const riskReward =
    profitAtTarget !== null && lossAtStop > 0 ? profitAtTarget / lossAtStop : null;

  return {
    shares,
    lots: shares / LOT_SIZE,
    totalValue,
    averagePrice,
    lossAtStop,
    lossPercentOfBalance: balance > 0 ? (lossAtStop / balance) * 100 : 0,
    profitAtTarget,
    riskReward,
  };
}
