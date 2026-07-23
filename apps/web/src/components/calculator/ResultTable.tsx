'use client';

import type { EntryRow } from '@mm/calc';
import { formatDecimal, formatGrouped } from '@mm/ui';

interface Props {
  rows: EntryRow[];
  totalPctOfModal: number;
  totalLots: number;
  totalValue: number;
}

/**
 * The per-entry breakdown. Demoted from hero to detail: the headline answer now
 * lives in the readout, so this can be dense and quiet.
 *
 * It scrolls horizontally inside its own container on narrow screens rather than
 * collapsing to cards — the columns are short numbers, and four stacked cards
 * cost far more vertical space than they earn now that the answer is at the top.
 */
export function ResultTable({ rows, totalPctOfModal, totalLots, totalValue }: Props) {
  return (
    <div className="mm-table-scroll">
      <table className="mm-table">
        <caption className="mm-sr-only">
          Rincian lot per entry, dengan persentase modal dan nilai rupiah
        </caption>
        <thead>
          <tr>
            <th scope="col">Entry</th>
            <th scope="col">SL</th>
            <th scope="col">Lot</th>
            <th scope="col" className="mm-th-exact">%m</th>
            <th scope="col">Modal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.index} className={r.lots === 0 ? 'mm-row--zero' : undefined}>
              <th scope="row">{formatGrouped(r.entry)}</th>
              <td>{formatGrouped(r.stopLoss)}</td>
              <td>
                <span className="mm-lotpill">{r.lots}</span>
              </td>
              <td>{formatDecimal(r.pctOfModal, 1)}</td>
              <td>{r.valueActual > 0 ? formatGrouped(r.valueActual) : '—'}</td>
            </tr>
          ))}
          <tr className="mm-row--total">
            <th scope="row">Total</th>
            <td />
            <td>{totalLots}</td>
            <td>{formatDecimal(totalPctOfModal, 1)}</td>
            <td>{formatGrouped(totalValue)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
