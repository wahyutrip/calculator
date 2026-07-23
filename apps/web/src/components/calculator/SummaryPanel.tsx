'use client';

import type { SideSummary } from '@mm/calc';
import { formatDecimal, formatPercent, formatRatio, formatRupiah } from '@mm/ui';
import * as React from 'react';

interface Props {
  actual: SideSummary;
  planned: SideSummary;
  hasTakeProfit: boolean;
}

/**
 * Actual against Planned, as one aligned comparison rather than two separate
 * cards. Reading a difference is the whole point, and two cards side by side
 * made the eye jump between columns to do it.
 *
 * Planned is deliberately the muted column: it is the reference, not the number
 * you will trade.
 */
export function SummaryPanel({ actual, planned, hasTakeProfit }: Props) {
  const rows: Array<{ label: string; actual: string; planned: string; tone?: 'bear' }> = [
    {
      label: 'Harga rata-rata',
      actual: actual.shares > 0 ? formatDecimal(actual.averagePrice, 1) : '—',
      planned: formatDecimal(planned.averagePrice, 1),
    },
    {
      label: 'Total lot',
      actual: formatDecimal(actual.lots, 0),
      planned: formatDecimal(planned.lots, 1),
    },
    {
      label: 'Total modal',
      actual: formatRupiah(actual.totalValue),
      planned: formatRupiah(planned.totalValue),
    },
    {
      label: 'Kerugian di SL',
      actual: `${formatRupiah(-actual.lossAtStop)} (${formatPercent(actual.lossPercentOfBalance)})`,
      planned: `${formatRupiah(-planned.lossAtStop)} (${formatPercent(planned.lossPercentOfBalance)})`,
      tone: 'bear',
    },
  ];

  if (hasTakeProfit) {
    rows.push(
      {
        label: 'Profit di TP',
        actual: actual.profitAtTarget === null ? '—' : formatRupiah(actual.profitAtTarget),
        planned: planned.profitAtTarget === null ? '—' : formatRupiah(planned.profitAtTarget),
      },
      {
        label: 'Risk : reward',
        actual: formatRatio(actual.riskReward),
        planned: formatRatio(planned.riskReward),
      },
    );
  }

  return (
    <div className="mm-compare-grid">
      <div className="mm-ch" />
      <div className="mm-ch mm-cv" style={{ textAlign: 'right' }}>
        Actual
      </div>
      <div className="mm-ch mm-cv" style={{ textAlign: 'right' }}>
        Planned
      </div>

      {rows.map((r) => (
        <React.Fragment key={r.label}>
          <div className="mm-cl">{r.label}</div>
          <div className={`mm-cv${r.tone === 'bear' ? ' mm-neg' : ''}`} style={r.tone === 'bear' ? { color: 'var(--bear-ink)' } : undefined}>
            {r.actual}
          </div>
          <div className="mm-cv mm-cv--muted">{r.planned}</div>
        </React.Fragment>
      ))}
    </div>
  );
}
