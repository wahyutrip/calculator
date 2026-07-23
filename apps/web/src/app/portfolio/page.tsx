'use client';

import { LOT_SIZE } from '@mm/calc';
import type { SavedPlanDto } from '@mm/schemas';
import { Badge, Button, Card, formatDecimal, formatRupiah } from '@mm/ui';
import Link from 'next/link';
import * as React from 'react';
import { planTotals } from '@/lib/plan-state';
import { planRepository } from '@/lib/storage/local-storage-repository';

export default function PortfolioPage() {
  const [plans, setPlans] = React.useState<SavedPlanDto[] | null>(null);
  const [toast, setToast] = React.useState<React.ReactNode>(null);

  const refresh = React.useCallback(() => {
    void planRepository.list().then(setPlans);
  }, []);

  React.useEffect(() => {
    refresh();
    // Without this, two open tabs silently overwrite each other and the user
    // watches a plan vanish.
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function remove(plan: SavedPlanDto) {
    await planRepository.remove(plan.id);
    refresh();
    // Deletion is the only destructive action here and it is one tap.
    setToast(
      <>
        <span>Rencana dihapus.</span>
        <button
          type="button"
          className="mm-btn"
          style={{ minHeight: 36, padding: '8px 12px' }}
          onClick={async () => {
            await planRepository.save(plan);
            refresh();
            setToast(null);
          }}
        >
          Urungkan
        </button>
      </>,
    );
  }

  async function duplicate(plan: SavedPlanDto) {
    const now = new Date().toISOString();
    await planRepository.save({
      ...plan,
      id: crypto.randomUUID(),
      name: `${plan.name} (salinan)`,
      createdAt: now,
      updatedAt: now,
    });
    refresh();
    setToast('Rencana diduplikasi.');
  }

  async function markFilled(plan: SavedPlanDto) {
    const totals = planTotals(plan);
    if (!totals || totals.lots === 0) {
      setToast('Rencana ini belum menghasilkan lot, jadi belum bisa ditandai terisi.');
      return;
    }
    await planRepository.save({
      ...plan,
      status: 'filled',
      // Seeded from the ACTUAL whole-lot totals — the fractional planned figures
      // were never bought.
      existing: { lots: Math.round(totals.lots), avgPrice: Math.round(totals.averagePrice) },
      updatedAt: new Date().toISOString(),
    });
    refresh();
    setToast('Ditandai terisi. Buka rencana untuk average down / up.');
  }

  if (plans === null) return <p className="mm-empty">Memuat…</p>;

  return (
    <div className="mm-stack">
      <Card>
        <div className="mm-section-head">
          <span>Portofolio</span>
          <span className="mm-count">{plans.length} rencana</span>
        </div>
        {/* Disclosed in the UI, not buried in docs: this is a real consequence of
            having no account. */}
        <p className="mm-hint">
          Rencana disimpan di browser ini saja. Install aplikasi agar data tidak hilang.
        </p>
      </Card>

      {plans.length === 0 ? (
        <Card>
          <div className="mm-empty">
            <p>Belum ada rencana tersimpan.</p>
            <Link href="/" className="mm-btn mm-btn--primary" style={{ textDecoration: 'none' }}>
              Buat rencana pertama
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mm-planlist">
          {plans.map((plan) => {
            const totals = planTotals(plan);
            return (
              <article className="mm-plan" key={plan.id}>
                <div className="mm-plan-head">
                  <span className="mm-plan-title">{plan.ticker ?? 'Tanpa ticker'}</span>
                  <Badge tone={plan.status === 'filled' ? 'bull' : 'neutral'}>
                    {plan.status === 'filled' ? 'Terisi' : 'Rencana'}
                  </Badge>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{plan.name}</span>
                </div>
                <div className="mm-plan-stats">
                  <span>
                    {totals ? formatDecimal(totals.lots, 0) : '—'} lot
                    {totals ? ` · ${totals.lots * LOT_SIZE} lembar` : ''}
                  </span>
                  <span>avg {totals && totals.lots > 0 ? formatDecimal(totals.averagePrice, 1) : '—'}</span>
                  <span>{totals ? formatRupiah(totals.totalValue) : '—'}</span>
                  <span className="mm-neg">
                    SL {totals ? formatRupiah(-totals.lossAtStop) : '—'}
                  </span>
                </div>
                <div className="mm-plan-actions">
                  <Link
                    href={`/plan/${plan.id}`}
                    className="mm-btn"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                  >
                    Buka
                  </Link>
                  <Button onClick={() => duplicate(plan)}>Duplikat</Button>
                  {plan.status === 'draft' ? (
                    <Button onClick={() => markFilled(plan)}>Tandai terisi</Button>
                  ) : null}
                  <Button variant="danger" onClick={() => remove(plan)}>
                    Hapus
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {toast ? (
        <div className="mm-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
