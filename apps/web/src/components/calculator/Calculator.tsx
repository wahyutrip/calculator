'use client';

import { Button, formatDecimal, formatGrouped } from '@mm/ui';
import type { SavedPlanDto } from '@mm/schemas';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { AveragingPanel } from './AveragingPanel';
import { EntryLadder } from './EntryLadder';
import { ParameterFields } from './ParameterFields';
import { Readout } from './Readout';
import { ResultTable } from './ResultTable';
import { SummaryPanel } from './SummaryPanel';
import { WarningList } from './WarningList';
import { TickerPicker } from '@/components/ticker/TickerPicker';
import { INITIAL_STATE, toPlanDto, useCalculator, type FormState } from '@/hooks/useCalculator';
import { planRepository } from '@/lib/storage/local-storage-repository';
import { StorageFullError } from '@/lib/storage/plan-repository';
import { encodePlan } from '@/lib/share/url-hash';

interface Props {
  initialState?: FormState;
  existingPlan?: SavedPlanDto | null;
}

export function Calculator({ initialState, existingPlan = null }: Props) {
  const router = useRouter();
  const calc = useCalculator(initialState ?? INITIAL_STATE);
  const { state, update, setEntry, addEntry, removeEntry, errors, result, stale } = calc;
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const data = result?.ok ? result.data : null;
  const totalLots = data ? data.rows.reduce((a, r) => a + r.lots, 0) : 0;

  async function save() {
    const input = toPlanDto(state);
    if (!input || calc.hasErrors) {
      setToast('Perbaiki isian yang bertanda merah dulu.');
      return;
    }
    const now = new Date().toISOString();
    const plan: SavedPlanDto = {
      id: existingPlan?.id ?? crypto.randomUUID(),
      ticker: state.ticker,
      name:
        existingPlan?.name ??
        `${state.ticker ?? 'Rencana'} ${new Date().toLocaleDateString('id-ID')}`,
      status: existingPlan?.status ?? 'draft',
      // Only inputs are stored, never computed results — a stored figure would
      // drift from the engine after any fix.
      input,
      existing: input.existing,
      createdAt: existingPlan?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await planRepository.save(plan);
      setToast('Rencana tersimpan.');
      router.push('/portfolio');
    } catch (e) {
      setToast(e instanceof StorageFullError ? e.message : 'Gagal menyimpan rencana.');
    }
  }

  async function share() {
    const input = toPlanDto(state);
    if (!input) return;
    const url = `${window.location.origin}/${encodePlan(input)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link disalin.');
    } catch {
      setToast('Tidak bisa menyalin — salin manual dari address bar.');
    }
  }

  async function copySummary() {
    if (!data) return;
    const lines = [
      `${state.ticker ?? 'Rencana'} · Rencana beli`,
      ...data.rows.map(
        (r) =>
          `Buy ${r.index}  ${formatGrouped(r.entry).padStart(7)}  →  ${r.lots} lot${
            r.valueActual > 0 ? `   Rp ${formatGrouped(r.valueActual)}` : ''
          }`,
      ),
      `Total: ${totalLots} lot · Rp ${formatGrouped(data.actual.totalValue)}${
        data.actual.shares > 0 ? ` · avg ${formatDecimal(data.actual.averagePrice, 0)}` : ''
      }`,
      `SL ${formatGrouped(state.stopLoss ?? 0)} · risiko Rp ${formatGrouped(
        data.actual.lossAtStop,
      )} (${formatDecimal(data.actual.lossPercentOfBalance, 1)}%m)`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setToast('Ringkasan disalin.');
    } catch {
      setToast('Tidak bisa menyalin ringkasan.');
    }
  }

  return (
    <div className="mm-shell">
      {/* ── the answer, first in DOM so a phone shows it before the form ── */}
      <div className="mm-area-readout">
        <Readout data={data} totalLots={totalLots} hasTakeProfit={state.takeProfit !== null} />
      </div>

      {/* ── form ─────────────────────────────────────────────────────── */}
      <div className="mm-area-form mm-stack">
        <section className="mm-panel">
          <div className="mm-panel-body">
            <TickerPicker value={state.ticker} onChange={(code) => update({ ticker: code })} />
            <EntryLadder
              entries={state.entries}
              rows={data?.rows ?? []}
              onChange={setEntry}
              onAdd={addEntry}
              onRemove={removeEntry}
              error={errors.entries ?? null}
            />
            <ParameterFields state={state} update={update} errors={errors} />
          </div>
        </section>

        <section className="mm-panel">
          <div className="mm-panel-body">
            <AveragingPanel
              state={state}
              update={update}
              errors={errors}
              averaging={data?.averaging ?? null}
            />
          </div>
        </section>
      </div>

      {/* ── detail ───────────────────────────────────────────────────── */}
      <div className="mm-area-detail mm-stack">
        {/* Dims rather than disappearing — the user is never left staring at
            nothing while correcting a typo. */}
        <div className={stale ? 'mm-dim' : undefined}>
          {data ? (
            <div className="mm-stack">
              {data.warnings.length ? <WarningList warnings={data.warnings} /> : null}

              <section className="mm-panel">
                <div className="mm-panel-head">
                  <span className="mm-panel-title">Rincian per entry</span>
                  <span className="mm-panel-meta">
                    {totalLots} lot · {formatGrouped(data.actual.shares)} lembar
                  </span>
                </div>
                <ResultTable
                  rows={data.rows}
                  totalPctOfModal={data.totalPctOfModal}
                  totalLots={totalLots}
                  totalValue={data.actual.totalValue}
                />
              </section>

              <section className="mm-panel">
                <div className="mm-panel-head">
                  <span className="mm-panel-title">Actual vs planned</span>
                  <span className="mm-panel-meta">efek pembulatan lot</span>
                </div>
                <div className="mm-panel-body">
                  <SummaryPanel
                    actual={data.actual}
                    planned={data.planned}
                    hasTakeProfit={state.takeProfit !== null}
                  />
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <div className="mm-actions">
          <Button variant="primary" onClick={save}>
            {existingPlan ? 'Simpan perubahan' : 'Simpan ke Portofolio'}
          </Button>
          <Button onClick={share}>Bagikan</Button>
          <Button onClick={copySummary}>Salin ringkasan</Button>
          <Button variant="ghost" onClick={calc.reset}>
            Reset
          </Button>
        </div>
      </div>

      {toast ? (
        <div className="mm-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
