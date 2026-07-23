'use client';

import { MAX_ENTRIES, snapToTick, type EntryRow } from '@mm/calc';
import { NumericInput, formatGrouped } from '@mm/ui';
import * as React from 'react';

interface Props {
  entries: Array<number | null>;
  rows: EntryRow[];
  onChange: (index: number, value: number | null) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  error?: string | null;
}

/**
 * One compact line per rung: label, price, and the lot this entry actually buys.
 *
 * The first design gave every rung a full-width input, a repeated tick hint and
 * three icon buttons — twelve controls of chrome for four prices, with the result
 * only visible in a table further down. Showing the lot inline answers "what does
 * this entry get me" exactly where the price is typed.
 *
 * Reordering was dropped: rows are sorted by the engine anyway, so the buttons
 * changed nothing but cost three targets per row.
 */
export function EntryLadder({ entries, rows, onChange, onAdd, onRemove, error }: Props) {
  const [focusIndex, setFocusIndex] = React.useState<number | null>(null);
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);

  // A new row you then have to hunt for is the failure mode on a phone.
  React.useEffect(() => {
    if (focusIndex === null) return;
    const el = refs.current[focusIndex];
    setFocusIndex(null);
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: 'nearest' });
  }, [focusIndex]);

  const atCap = entries.length >= MAX_ENTRIES;

  return (
    <section aria-labelledby="ladder-heading" className="mm-stack-sm">
      <div className="mm-eyebrow">
        <span id="ladder-heading">Rencana beli</span>
        <span className="mm-count">
          {entries.length} entry{atCap ? ' · maksimal' : ''}
        </span>
      </div>

      <div className="mm-ladder">
        {entries.map((value, i) => {
          const row = rows[i];
          const lots = row?.lots ?? 0;
          return (
            <div className="mm-rung" key={`rung-${i}`}>
              <span className="mm-rung-tag" aria-hidden="true">
                Buy {i + 1}
              </span>
              <NumericInput
                ref={(el) => {
                  refs.current[i] = el;
                }}
                id={`entry-${i}`}
                label={`Buy ${i + 1}`}
                value={value}
                onChange={(v) => onChange(i, v)}
                prefix="Rp"
                min={1}
                max={10_000_000}
                snapOnBlur={snapToTick}
              />
              <div className="mm-rung-out">
                <span
                  className={`mm-rung-lot${lots === 0 ? ' mm-rung-lot--zero' : ''}`}
                  aria-label={`${lots} lot untuk Buy ${i + 1}`}
                >
                  {formatGrouped(lots)} lot
                </span>
                {entries.length > 1 ? (
                  <button
                    type="button"
                    className="mm-rung-kill"
                    aria-label={`Hapus Buy ${i + 1}`}
                    title={`Hapus Buy ${i + 1}`}
                    onClick={() => onRemove(i)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="mm-addrow"
        disabled={atCap}
        onClick={() => {
          onAdd();
          setFocusIndex(entries.length);
        }}
      >
        + Tambah entry
      </button>

      {atCap ? (
        <span className="mm-hint">
          Maksimal {MAX_ENTRIES} entry — risiko dibagi rata, jadi ladder lebih panjang membuat tiap
          level jatuh di bawah 1 lot.
        </span>
      ) : null}

      {error ? (
        <span className="mm-error" role="alert">
          {error}
        </span>
      ) : null}
    </section>
  );
}
