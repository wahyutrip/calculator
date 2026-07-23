'use client';

import type { Ticker } from '@mm/schemas';
import * as React from 'react';
import { findTicker, loadTickers, searchTickers } from '@/lib/tickers';
import { pushRecentTicker, readPrefs } from '@/lib/prefs';

interface Props {
  value: string | null;
  onChange: (code: string | null) => void;
}

/**
 * Optional, and now sized like it.
 *
 * The first design gave this a full-width empty search bar at the top of the
 * page — the most prominent element on screen for the one field that does not
 * affect a single number. It collapses to a chip once chosen, and to a modest
 * search line when not.
 *
 * Built on the ARIA combobox pattern rather than pulling in cmdk: this is a
 * listbox with arrow keys, and a dependency for that is not worth the bytes on a
 * tool that must load fast on bad mobile data.
 */
export function TickerPicker({ value, onChange }: Props) {
  const [all, setAll] = React.useState<Ticker[]>([]);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [recent, setRecent] = React.useState<string[]>([]);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    void loadTickers().then(setAll);
    setRecent(readPrefs().recentTickers);
  }, []);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selected = findTicker(all, value);

  const results = React.useMemo(() => {
    if (query.trim()) return searchTickers(all, query);
    return recent.map((c) => findTicker(all, c)).filter((t): t is Ticker => t !== null);
  }, [all, query, recent]);

  React.useEffect(() => setActive(0), [query]);

  function choose(t: Ticker) {
    onChange(t.code);
    pushRecentTicker(t.code);
    setRecent(readPrefs().recentTickers);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const t = results[active];
      if (open && t) {
        e.preventDefault();
        choose(t);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Chosen: a compact chip, not a search field taking up a whole row.
  if (selected && !open) {
    return (
      <div className="mm-combo" ref={boxRef}>
        <span className="mm-ticker-chip">
          <b>{selected.code}</b>
          <span>{selected.name}</span>
          <button
            type="button"
            className="mm-iconbtn"
            style={{ width: 26, height: 26, fontSize: 14 }}
            aria-label="Hapus pilihan saham"
            onClick={() => {
              onChange(null);
              setQuery('');
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="mm-combo" ref={boxRef}>
      <label htmlFor="ticker-search" className="mm-sr-only">
        Cari saham (opsional)
      </label>
      <div className="mm-ctrl">
        <input
          id="ticker-search"
          className="mm-input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="ticker-listbox"
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `ticker-opt-${active}` : undefined}
          autoComplete="off"
          placeholder="Kode atau nama saham — opsional"
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open ? (
        <ul className="mm-combo-list" id="ticker-listbox" role="listbox">
          {results.length === 0 ? (
            <li className="mm-combo-option" style={{ color: 'var(--muted)', cursor: 'default' }}>
              {query.trim()
                ? 'Tidak ditemukan — Anda tetap bisa menghitung tanpa memilih saham.'
                : 'Ketik kode atau nama saham…'}
            </li>
          ) : (
            results.map((t, i) => (
              <li
                key={t.code}
                id={`ticker-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className="mm-combo-option"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(t);
                }}
              >
                <span className="mm-combo-code">{t.code}</span>
                <span className="mm-combo-name">{t.name}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
