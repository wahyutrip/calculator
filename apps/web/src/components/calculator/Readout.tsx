'use client';

import type { PlanOutput } from '@mm/calc';
import { formatDecimal, formatGrouped, formatPercent, formatRatio, formatRupiah } from '@mm/ui';

interface Props {
  data: PlanOutput | null;
  totalLots: number;
  hasTakeProfit: boolean;
}

/**
 * The answer.
 *
 * The whole product exists to answer one question — "how many lots do I buy?" —
 * and in the first design that number sat four screens down on a phone, below
 * every input. It is now the loudest object on the page and, on mobile, sticks
 * under the top bar so it stays visible while the form is edited.
 */
export function Readout({ data, totalLots, hasTakeProfit }: Props) {
  if (!data || data.actual.shares === 0) {
    return (
      <div className="mm-readout">
        <div>
          <div className="mm-readout-label">Total lot</div>
          <div className="mm-readout-lots">
            0 <small>lot</small>
          </div>
        </div>
        <p className="mm-readout-empty" style={{ margin: 0 }}>
          {data
            ? 'Belum ada entry yang mencapai 1 lot. Naikkan balance, atau dekatkan SL ke harga entry.'
            : 'Isi minimal satu entry di atas SL dan balance minimal Rp 100.000.'}
        </p>
      </div>
    );
  }

  const { actual, riskBudget } = data;
  // The gap between configured and real risk is the thing this tool shows that a
  // spreadsheet does not, so it sits in the readout rather than a footnote.
  const usedPct = riskBudget > 0 ? (actual.lossAtStop / riskBudget) * 100 : 0;

  return (
    <div className="mm-readout">
      <div className="mm-readout-top">
        <div>
          <div className="mm-readout-label">Total lot</div>
          <div className="mm-readout-lots">
            {formatGrouped(totalLots)}
            <small>lot · {formatGrouped(actual.shares)} lembar</small>
          </div>
        </div>
        <div className="mm-readout-modal">
          <div className="mm-readout-label">Total modal</div>
          <div className="mm-v">{formatRupiah(actual.totalValue)}</div>
        </div>
      </div>

      <dl className="mm-readout-grid">
        <div className="mm-readout-cell">
          <dt>Avg beli</dt>
          <dd>{formatDecimal(actual.averagePrice, 1)}</dd>
        </div>
        <div className="mm-readout-cell">
          <dt>Risiko SL</dt>
          <dd className="mm-down">
            −{formatGrouped(actual.lossAtStop)}
            <span
              style={{ fontSize: 11, marginLeft: 5, color: 'var(--readout-muted)', fontWeight: 500 }}
            >
              {formatPercent(actual.lossPercentOfBalance)}
            </span>
          </dd>
        </div>
        {hasTakeProfit && actual.profitAtTarget !== null ? (
          <div className="mm-readout-cell">
            <dt>Profit TP</dt>
            <dd className={actual.profitAtTarget >= 0 ? 'mm-up' : 'mm-down'}>
              {actual.profitAtTarget >= 0 ? '+' : '−'}
              {formatGrouped(Math.abs(actual.profitAtTarget))}
              <span
                style={{
                  fontSize: 11,
                  marginLeft: 5,
                  color: 'var(--readout-muted)',
                  fontWeight: 500,
                }}
              >
                {formatRatio(actual.riskReward)}
              </span>
            </dd>
          </div>
        ) : (
          <div className="mm-readout-cell">
            <dt>Anggaran</dt>
            <dd className={usedPct < 50 ? 'mm-down' : undefined}>{formatPercent(usedPct, 0)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
