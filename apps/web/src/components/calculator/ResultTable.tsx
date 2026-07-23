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
 * Two components, one dataset. Which one shows is chosen by a CSS media query,
 * not by measuring width in JS — measuring gives a hydration mismatch and a
 * visible layout swap on load.
 */
export function ResultTable({ rows, totalPctOfModal, totalLots, totalValue }: Props) {
  return (
    <>
      <div className="mm-table-scroll">
        <table className="mm-table">
          <caption className="mm-sr-only">
            Rincian lot per entry, lengkap dengan persentase modal dan nilai rupiah
          </caption>
          <thead>
            <tr>
              <th scope="col">Entry</th>
              <th scope="col">SL</th>
              <th scope="col">Lot</th>
              <th scope="col">%m</th>
              <th scope="col">Rp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.index} className={r.lots === 0 ? 'mm-row--zero' : undefined}>
                <th scope="row" style={{ fontWeight: 400, textAlign: 'left' }}>
                  {formatGrouped(r.entry)}
                </th>
                <td>{formatGrouped(r.stopLoss)}</td>
                <td>
                  <span className="mm-lotpill">{r.lots}</span>
                </td>
                <td>{formatDecimal(r.pctOfModal, 1)}</td>
                <td>{formatGrouped(r.valueActual)}</td>
              </tr>
            ))}
            <tr className="mm-row--total">
              <th scope="row" style={{ textAlign: 'left' }}>
                Total
              </th>
              <td />
              <td>{totalLots}</td>
              <td>{formatDecimal(totalPctOfModal, 1)}</td>
              <td>{formatGrouped(totalValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mm-cards">
        {rows.map((r) => (
          <div
            key={r.index}
            className={`mm-rcard${r.lots === 0 ? ' mm-rcard--zero' : ''}`}
          >
            <div className="mm-rcard-top">
              <span>Buy {r.index}</span>
              <span className="mm-lotpill">{r.lots} lot</span>
            </div>
            <div className="mm-rcard-line">
              <span>
                Entry {formatGrouped(r.entry)} · SL {formatGrouped(r.stopLoss)}
              </span>
              <span>{formatDecimal(r.pctOfModal, 1)}%m</span>
            </div>
            <div className="mm-rcard-line">
              <span>Modal</span>
              <span>Rp {formatGrouped(r.valueActual)}</span>
            </div>
          </div>
        ))}
        <div className="mm-rcard mm-rcard--total">
          <div className="mm-rcard-top">
            <span>Total</span>
            <span>{totalLots} lot</span>
          </div>
          <div className="mm-rcard-line">
            <span>{formatDecimal(totalPctOfModal, 1)}%m</span>
            <span>Rp {formatGrouped(totalValue)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
