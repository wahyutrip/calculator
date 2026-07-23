'use client';

import type { AveragingResult } from '@mm/calc';
import { Badge, Callout, NumericInput, formatDecimal, formatRupiah } from '@mm/ui';
import type { FieldErrors, FormState } from '@/hooks/useCalculator';

interface Props {
  state: FormState;
  update: (patch: Partial<FormState>) => void;
  errors: FieldErrors;
  averaging: AveragingResult | null;
}

function Delta({ before, after, digits = 0 }: { before: number; after: number; digits?: number }) {
  const d = after - before;
  if (Math.abs(d) < 0.05) return <span style={{ color: 'var(--faint)' }}>—</span>;
  // Colour is never the only signal: the arrow and sign travel with it.
  return (
    <span className={d > 0 ? 'mm-pos' : 'mm-neg'}>
      {d > 0 ? '▲ +' : '▼ '}
      {formatDecimal(d, digits)}
    </span>
  );
}

export function AveragingPanel({ state, update, errors, averaging }: Props) {
  return (
    <section aria-labelledby="avg-heading" className="mm-stack-sm">
      <div className="mm-eyebrow">
        <span id="avg-heading">Average down / up</span>
        <label className="mm-check" style={{ marginLeft: 'auto' }}>
          <input
            type="checkbox"
            checked={state.averagingEnabled}
            onChange={(e) => update({ averagingEnabled: e.currentTarget.checked })}
          />
          <span>Saya sudah punya posisi</span>
        </label>
      </div>

      {state.averagingEnabled ? (
        <>
          <div className="mm-params">
            <NumericInput
              id="existing-lots"
              label="Lot dimiliki"
              value={state.existingLots}
              onChange={(v) => update({ existingLots: v })}
              suffix="lot"
              min={1}
              error={errors.existing ?? null}
            />
            <NumericInput
              id="existing-avg"
              label="Harga rata-rata"
              value={state.existingAvgPrice}
              onChange={(v) => update({ existingAvgPrice: v })}
              prefix="Rp"
              min={1}
              error={errors.entries ?? null}
            />
          </div>

          {averaging ? (
            <>
              {/*
                The single most important behaviour here. Averaging down into a
                position already past its risk budget is how retail accounts are
                destroyed; a tool that quietly hands back lot numbers endorses it.
              */}
              {averaging.blocked ? (
                <Callout tone="danger">
                  <strong>Posisi Anda sudah melebihi anggaran risiko.</strong> Di SL{' '}
                  {formatDecimal(averaging.before.averagePrice, 0)} posisi sekarang berisiko{' '}
                  {formatRupiah(averaging.existingRisk)}, melebihi anggaran. Menambah posisi hanya
                  memperbesar kerugian. Turunkan SL, kurangi posisi, atau naikkan toleransi risiko.
                </Callout>
              ) : null}

              <div>
                <div className="mm-eyebrow" style={{ marginBottom: 10 }}>
                  {averaging.mode === 'down' ? 'Average down' : 'Average up'}
                  {averaging.after.riskFree ? (
                    <Badge tone="bull" style={{ marginLeft: 'auto' }}>
                      Posisi bebas risiko
                    </Badge>
                  ) : null}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="mm-compare">
                    <thead>
                      <tr>
                        <th scope="col" />
                        <th scope="col">Sebelum</th>
                        <th scope="col">Sesudah</th>
                        <th scope="col">Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">Lot</th>
                        <td>{formatDecimal(averaging.before.lots, 0)}</td>
                        <td>{formatDecimal(averaging.after.lots, 0)}</td>
                        <td>
                          <Delta before={averaging.before.lots} after={averaging.after.lots} />
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Harga rata-rata</th>
                        <td>{formatDecimal(averaging.before.averagePrice, 1)}</td>
                        <td>{formatDecimal(averaging.after.averagePrice, 1)}</td>
                        <td>
                          <Delta
                            before={averaging.before.averagePrice}
                            after={averaging.after.averagePrice}
                            digits={1}
                          />
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Total modal</th>
                        <td>{formatRupiah(averaging.before.totalValue)}</td>
                        <td>{formatRupiah(averaging.after.totalValue)}</td>
                        <td>
                          <Delta
                            before={averaging.before.totalValue}
                            after={averaging.after.totalValue}
                          />
                        </td>
                      </tr>
                      <tr>
                        {/* Shown next to the improved average on purpose: averaging
                            down lowers the average AND raises the loss at stop. */}
                        <th scope="row">Kerugian di SL</th>
                        <td>{formatRupiah(averaging.before.lossAtStop)}</td>
                        <td>{formatRupiah(averaging.after.lossAtStop)}</td>
                        <td>
                          <Delta
                            before={averaging.before.lossAtStop}
                            after={averaging.after.lossAtStop}
                          />
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Break even (incl. fee)</th>
                        <td>{formatDecimal(averaging.before.breakEven, 1)}</td>
                        <td>{formatDecimal(averaging.after.breakEven, 1)}</td>
                        <td>
                          <Delta
                            before={averaging.before.breakEven}
                            after={averaging.after.breakEven}
                            digits={1}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="mm-hint">Isi lot dan harga rata-rata untuk melihat perbandingan.</p>
          )}
        </>
      ) : (
        <p className="mm-hint">
          Aktifkan bila Anda sudah memegang saham ini — risiko posisi lama ikut dihitung.
        </p>
      )}
    </section>
  );
}
