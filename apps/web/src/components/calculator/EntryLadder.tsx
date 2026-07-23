'use client';

import { MAX_ENTRIES, snapToTick, tickSize } from '@mm/calc';
import { IconButton, NumericInput, formatGrouped } from '@mm/ui';
import * as React from 'react';

interface Props {
  entries: Array<number | null>;
  onChange: (index: number, value: number | null) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  error?: string | null;
}

export function EntryLadder({ entries, onChange, onAdd, onRemove, onMove, error }: Props) {
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
    <section aria-labelledby="ladder-heading">
      <div className="mm-section-head">
        <span id="ladder-heading">Entry ladder</span>
        <span className="mm-count">
          {entries.length} entry{atCap ? ' (maksimal)' : ''}
        </span>
      </div>

      <div className="mm-ladder">
        {entries.map((value, i) => (
          <div className="mm-rung" key={`rung-${i}`}>
            <span className="mm-rung-label" aria-hidden="true">
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
              hint={
                value !== null && value > 0 ? `fraksi Rp ${formatGrouped(tickSize(value))}` : null
              }
            />
            <div className="mm-rung-actions">
              {/* Drag fights page scroll on touch, so the buttons are the primary
                  mechanism rather than a fallback. */}
              <IconButton
                label={`Naikkan Buy ${i + 1}`}
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
              >
                ▲
              </IconButton>
              <IconButton
                label={`Turunkan Buy ${i + 1}`}
                onClick={() => onMove(i, 1)}
                disabled={i === entries.length - 1}
              >
                ▼
              </IconButton>
              {/* Hidden, not disabled, on the last row — a permanently dead
                  control is worse than an absent one. */}
              {entries.length > 1 ? (
                <IconButton label={`Hapus Buy ${i + 1}`} tone="danger" onClick={() => onRemove(i)}>
                  ×
                </IconButton>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mm-addrow"
        style={{ marginTop: 8 }}
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
          level di bawah 1 lot.
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
