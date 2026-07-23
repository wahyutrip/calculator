'use client';

import {
  DEFAULT_BUY_FEE_PERCENT,
  DEFAULT_RISK_PERCENT,
  MAX_ENTRIES,
  SELL_TAX_PERCENT,
  calculate,
  type CalcResult,
  type PlanInput,
} from '@mm/calc';
import { planInputSchema, type PlanInputDto } from '@mm/schemas';
import * as React from 'react';

export interface FormState {
  ticker: string | null;
  entries: Array<number | null>;
  stopLoss: number | null;
  riskPercent: number;
  buyFeePercent: number;
  sellFeePercent: number;
  /** True once the user edits the sell fee; it then stops following the buy fee. */
  sellFeeTouched: boolean;
  balance: number | null;
  takeProfit: number | null;
  existingLots: number | null;
  existingAvgPrice: number | null;
  averagingEnabled: boolean;
}

export const INITIAL_STATE: FormState = {
  ticker: null,
  // Four rows is the habit most users arrive with, but the ladder is unbounded.
  entries: [1000, 900, 800, 700],
  stopLoss: 600,
  riskPercent: DEFAULT_RISK_PERCENT,
  buyFeePercent: DEFAULT_BUY_FEE_PERCENT,
  sellFeePercent: DEFAULT_BUY_FEE_PERCENT + SELL_TAX_PERCENT,
  sellFeeTouched: false,
  balance: 10_000_000,
  takeProfit: null,
  existingLots: null,
  existingAvgPrice: null,
  averagingEnabled: false,
};

export type FieldErrors = Partial<Record<string, string>>;

/** Empty rows are ignored, not rejected — clearing Buy 3 leaves a 3-entry plan. */
function usableEntries(entries: Array<number | null>): number[] {
  return entries.filter((e): e is number => e !== null && e > 0);
}

export function toPlanInput(state: FormState): PlanInput | null {
  const entries = usableEntries(state.entries);
  if (!entries.length || state.stopLoss === null || state.balance === null) return null;
  return {
    entries,
    stopLoss: state.stopLoss,
    riskPercent: state.riskPercent,
    buyFeePercent: state.buyFeePercent,
    sellFeePercent: state.sellFeePercent,
    balance: state.balance,
    takeProfit: state.takeProfit,
    existing:
      state.averagingEnabled && state.existingLots !== null && state.existingAvgPrice !== null
        ? { lots: state.existingLots, avgPrice: state.existingAvgPrice }
        : null,
  };
}

/**
 * The persisted / shared shape. PlanInput leaves takeProfit and existing
 * optional for engine callers; the DTO requires them explicitly so a missing key
 * can never be mistaken for a deliberate null on the way into storage.
 */
export function toPlanDto(state: FormState): PlanInputDto | null {
  const input = toPlanInput(state);
  if (!input) return null;
  return {
    ticker: state.ticker,
    entries: input.entries,
    stopLoss: input.stopLoss,
    riskPercent: input.riskPercent,
    buyFeePercent: input.buyFeePercent,
    sellFeePercent: input.sellFeePercent,
    balance: input.balance,
    takeProfit: input.takeProfit ?? null,
    existing: input.existing ?? null,
  };
}

export function useCalculator(initial: FormState = INITIAL_STATE) {
  const [state, setState] = React.useState<FormState>(initial);
  const [result, setResult] = React.useState<CalcResult | null>(null);
  const [stale, setStale] = React.useState(false);

  const update = React.useCallback((patch: Partial<FormState>) => {
    setState((s) => {
      const next = { ...s, ...patch };
      // The sell fee follows the buy fee until the user takes ownership of it. A
      // field that keeps overwriting an explicit edit is worse than one that
      // never updates.
      if (patch.buyFeePercent !== undefined && !s.sellFeeTouched) {
        next.sellFeePercent = Number((patch.buyFeePercent + SELL_TAX_PERCENT).toFixed(2));
      }
      return next;
    });
  }, []);

  const setEntry = React.useCallback((index: number, value: number | null) => {
    setState((s) => {
      const entries = s.entries.slice();
      entries[index] = value;
      return { ...s, entries };
    });
  }, []);

  const addEntry = React.useCallback(() => {
    setState((s) => {
      if (s.entries.length >= MAX_ENTRIES) return s;
      const last = s.entries[s.entries.length - 1];
      const seed = last ? Math.max(Math.round((last * 0.9) / 5) * 5, 1) : 1000;
      return { ...s, entries: [...s.entries, seed] };
    });
  }, []);

  const removeEntry = React.useCallback((index: number) => {
    setState((s) => {
      if (s.entries.length <= 1) return s;
      // Rows renumber immediately — Buy 3 becomes Buy 2 when Buy 2 is removed.
      return { ...s, entries: s.entries.filter((_, i) => i !== index) };
    });
  }, []);

  const moveEntry = React.useCallback((index: number, delta: number) => {
    setState((s) => {
      const target = index + delta;
      if (target < 0 || target >= s.entries.length) return s;
      const entries = s.entries.slice();
      const [item] = entries.splice(index, 1);
      entries.splice(target, 0, item ?? null);
      return { ...s, entries };
    });
  }, []);

  const reset = React.useCallback(() => setState(INITIAL_STATE), []);

  // Field-level validation, derived rather than stored so it can never drift.
  const errors = React.useMemo<FieldErrors>(() => {
    const out: FieldErrors = {};
    const input = toPlanInput(state);
    if (state.balance === null) out.balance = 'Balance wajib diisi';
    if (state.stopLoss === null) out.stopLoss = 'Harga SL wajib diisi';
    if (!input) return out;

    const parsed = planInputSchema.safeParse({ ...input, ticker: state.ticker });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!out[key]) out[key] = issue.message;
      }
    }
    return out;
  }, [state]);

  const hasErrors = Object.keys(errors).length > 0;

  // Live, debounced. The result area dims rather than disappearing while a field
  // is invalid, so the user is never left staring at nothing mid-correction.
  React.useEffect(() => {
    const input = toPlanInput(state);
    if (!input) {
      setStale(true);
      return;
    }
    setStale(true);
    const timer = setTimeout(() => {
      const next = calculate(input);
      if (next.ok) {
        setResult(next);
        setStale(false);
      } else {
        // Keep the last good result on screen, dimmed.
        setStale(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

  return {
    state,
    setState,
    update,
    setEntry,
    addEntry,
    removeEntry,
    moveEntry,
    reset,
    errors,
    hasErrors,
    result,
    stale,
  };
}
