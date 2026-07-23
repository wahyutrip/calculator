'use client';

import type { SideSummary } from '@mm/calc';
import { formatDecimal, formatPercent, formatRatio, formatRupiah, formatSignedRupiah } from '@mm/ui';

interface Props {
  actual: SideSummary;
  planned: SideSummary;
  hasTakeProfit: boolean;
}

function Metrics({ side, hasTakeProfit }: { side: SideSummary; hasTakeProfit: boolean }) {
  return (
    <dl className="mm-metrics">
      <div className="mm-metric">
        <dt>Estimated average</dt>
        <dd>{side.shares > 0 ? formatDecimal(side.averagePrice, 1) : '—'}</dd>
      </div>
      <div className="mm-metric">
        <dt>Total lot</dt>
        <dd>{formatDecimal(side.lots, side.lots % 1 === 0 ? 0 : 1)}</dd>
      </div>
      <div className="mm-metric">
        <dt>Total modal</dt>
        <dd>{formatRupiah(side.totalValue)}</dd>
      </div>
      <div className="mm-metric">
        <dt>Loss @ SL</dt>
        <dd className="mm-neg">
          {formatRupiah(-side.lossAtStop)} ({formatPercent(side.lossPercentOfBalance)})
        </dd>
      </div>
      {hasTakeProfit ? (
        <>
          <div className="mm-metric">
            <dt>Profit @ TP</dt>
            <dd className={side.profitAtTarget !== null && side.profitAtTarget < 0 ? 'mm-neg' : 'mm-pos'}>
              {side.profitAtTarget === null ? '—' : formatSignedRupiah(side.profitAtTarget)}
            </dd>
          </div>
          <div className="mm-metric">
            <dt>Risk : reward</dt>
            <dd>{formatRatio(side.riskReward)}</dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}

/**
 * Actual leads and comes FIRST in DOM order — on a phone the number that matters
 * is the one visible without scrolling. The reference tool shows only the planned
 * figures, which hides how much whole-lot rounding cut the real exposure.
 */
export function SummaryPanel({ actual, planned, hasTakeProfit }: Props) {
  return (
    <section className="mm-summary" aria-label="Ringkasan">
      <div className="mm-col mm-col--primary">
        <div className="mm-col-head">
          Actual <span>— lot bulat, yang benar-benar dibeli</span>
        </div>
        <Metrics side={actual} hasTakeProfit={hasTakeProfit} />
      </div>
      <div className="mm-col">
        <div className="mm-col-head">
          Planned <span>— ideal pecahan</span>
        </div>
        <Metrics side={planned} hasTakeProfit={hasTakeProfit} />
      </div>
    </section>
  );
}
