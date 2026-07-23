'use client';

import * as React from 'react';
import { Calculator } from '@/components/calculator/Calculator';
import { INITIAL_STATE, type FormState } from '@/hooks/useCalculator';
import { decodePlan } from '@/lib/share/url-hash';

export default function CalculatorPage() {
  const [initial, setInitial] = React.useState<FormState | null>(null);

  React.useEffect(() => {
    // A shared link carries the whole plan in the hash. That input is UNTRUSTED:
    // decodePlan validates it with the same schema as the form and returns null
    // for anything malformed, so a bad link loads defaults instead of throwing.
    const shared = decodePlan(window.location.hash);
    if (!shared) {
      setInitial(INITIAL_STATE);
      return;
    }
    setInitial({
      ...INITIAL_STATE,
      ticker: shared.ticker,
      entries: shared.entries,
      stopLoss: shared.stopLoss,
      riskPercent: shared.riskPercent,
      buyFeePercent: shared.buyFeePercent,
      sellFeePercent: shared.sellFeePercent,
      sellFeeTouched: true,
      balance: shared.balance,
      takeProfit: shared.takeProfit,
      averagingEnabled: shared.existing !== null,
      existingLots: shared.existing?.lots ?? null,
      existingAvgPrice: shared.existing?.avgPrice ?? null,
    });
  }, []);

  // Rendering the default state first and swapping would flash the wrong numbers
  // at anyone opening a shared link.
  if (!initial) return null;

  return <Calculator initialState={initial} />;
}
