'use client';

import type { SavedPlanDto } from '@mm/schemas';
import { Card } from '@mm/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { Calculator } from '@/components/calculator/Calculator';
import { planToFormState } from '@/lib/plan-state';
import { planRepository } from '@/lib/storage/local-storage-repository';

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const [plan, setPlan] = React.useState<SavedPlanDto | null | 'loading'>('loading');

  React.useEffect(() => {
    const id = params?.id;
    if (!id) {
      setPlan(null);
      return;
    }
    void planRepository.get(id).then(setPlan);
  }, [params?.id]);

  if (plan === 'loading') return <p className="mm-empty">Memuat…</p>;

  // Never a blank calculator for an unknown id — that would look like the plan
  // was silently wiped.
  if (plan === null) {
    return (
      <Card>
        <div className="mm-empty">
          <p>Rencana tidak ditemukan. Mungkin sudah dihapus dari browser ini.</p>
          <Link href="/portfolio" className="mm-btn" style={{ textDecoration: 'none' }}>
            Kembali ke portofolio
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="mm-stack">
      <Card>
        <div className="mm-section-head">
          <span>{plan.name}</span>
          <span className="mm-count">{plan.status === 'filled' ? 'Terisi' : 'Rencana'}</span>
        </div>
      </Card>
      <Calculator initialState={planToFormState(plan)} existingPlan={plan} />
    </div>
  );
}
