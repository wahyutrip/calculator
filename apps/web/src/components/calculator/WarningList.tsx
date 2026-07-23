'use client';

import type { CalcWarning } from '@mm/calc';
import { Callout, formatDecimal, formatRupiah } from '@mm/ui';

/**
 * The engine emits codes and numbers, never strings — it has no locale. The copy
 * is assembled here.
 */
export function WarningList({ warnings }: { warnings: CalcWarning[] }) {
  if (!warnings.length) return null;

  return (
    <div aria-live="polite">
      {warnings.map((w) => {
        switch (w.code) {
          case 'NO_FULL_LOT':
            return (
              <Callout key={w.code} tone="danger">
                <strong>Tidak ada entry yang mencapai 1 lot.</strong> Modal terlalu kecil untuk
                rentang harga ini, atau SL terlalu jauh dari entry.
              </Callout>
            );
          case 'RISK_UNDERUSED':
            return (
              <Callout key={w.code} tone="warning">
                <strong>Risiko riil jauh di bawah target.</strong> Pembulatan lot membuat kerugian
                nyata di SL hanya {formatRupiah(w.values.actualLoss ?? 0)} dari anggaran{' '}
                {formatRupiah(w.values.riskBudget ?? 0)}. Pertimbangkan menaikkan balance atau
                mengurangi jumlah entry.
              </Callout>
            );
          case 'OVER_ALLOCATED':
            return (
              <Callout key={w.code} tone="warning">
                <strong>Rencana melebihi modal.</strong> Jika semua entry terisi penuh, rencana ini
                butuh {formatRupiah(w.values.required ?? 0)} sementara modal Anda{' '}
                {formatRupiah(w.values.balance ?? 0)}.
              </Callout>
            );
          case 'RISK_SPREAD_THIN':
            return (
              <Callout key={w.code} tone="info">
                Risiko dibagi rata ke <strong>{w.values.entryCount ?? 0} entry</strong>, jadi tiap
                level hanya dapat {formatDecimal(w.values.percentEach ?? 0, 1)}% dari anggaran
                risiko.
              </Callout>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
