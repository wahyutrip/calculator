'use client';

import {
  FEE_PRESETS,
  MAX_BALANCE,
  MIN_BALANCE,
  RISK_PRESETS,
  SELL_TAX_PERCENT,
  snapToTick,
} from '@mm/calc';
import { NumericInput, Select, formatDecimal } from '@mm/ui';
import type { FieldErrors, FormState } from '@/hooks/useCalculator';

interface Props {
  state: FormState;
  update: (patch: Partial<FormState>) => void;
  errors: FieldErrors;
}

const CUSTOM = 'custom';

export function ParameterFields({ state, update, errors }: Props) {
  const riskIsPreset = RISK_PRESETS.some((p) => p.value === state.riskPercent);
  const feeIsPreset = FEE_PRESETS.includes(state.buyFeePercent);

  return (
    <section aria-labelledby="params-heading">
      <div className="mm-section-head">
        <span id="params-heading">Parameter</span>
      </div>

      <div className="mm-params">
        {/* SL comes first: the whole calculation hangs on it. */}
        <NumericInput
          id="stop-loss"
          label="SL Price"
          value={state.stopLoss}
          onChange={(v) => update({ stopLoss: v })}
          prefix="Rp"
          min={1}
          max={10_000_000}
          snapOnBlur={snapToTick}
          error={errors.stopLoss ?? null}
          className="mm-stop-field"
        />

        <Select
          id="risk"
          label="Risk"
          value={riskIsPreset ? String(state.riskPercent) : CUSTOM}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v !== CUSTOM) update({ riskPercent: Number(v) });
          }}
          options={[
            ...RISK_PRESETS.map((p) => ({
              value: String(p.value),
              label: `[${formatDecimal(p.value, 1)}%m] ${p.label}`,
            })),
            { value: CUSTOM, label: 'Custom…' },
          ]}
          error={errors.riskPercent ?? null}
        />

        <Select
          id="buy-fee"
          label="Fee beli"
          value={feeIsPreset ? String(state.buyFeePercent) : CUSTOM}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v !== CUSTOM) update({ buyFeePercent: Number(v) });
          }}
          options={[
            ...FEE_PRESETS.map((f) => ({ value: String(f), label: `${formatDecimal(f, 2)}%` })),
            { value: CUSTOM, label: 'Custom…' },
          ]}
          hint={`fee jual ${formatDecimal(state.sellFeePercent, 2)}% (+${formatDecimal(SELL_TAX_PERCENT, 1)}% PPh)`}
          error={errors.buyFeePercent ?? null}
        />

        {/* A plain rupiah amount — not a value in millions. */}
        <div>
          <NumericInput
            id="balance"
            label="Balance"
            labelSuffix="(modal, bukan equity)"
            value={state.balance}
            onChange={(v) => update({ balance: v })}
            prefix="Rp"
            min={MIN_BALANCE}
            max={MAX_BALANCE}
            error={errors.balance ?? null}
          />
          <div className="mm-quick">
            {[
              { label: '+1jt', amount: 1_000_000 },
              { label: '+10jt', amount: 10_000_000 },
              { label: '+100jt', amount: 100_000_000 },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() =>
                  update({ balance: Math.min((state.balance ?? 0) + chip.amount, MAX_BALANCE) })
                }
              >
                {chip.label}
              </button>
            ))}
            <button type="button" onClick={() => update({ balance: null })}>
              Kosongkan
            </button>
          </div>
        </div>
      </div>

      <details className="mm-advanced" style={{ marginTop: 12 }}>
        <summary
          style={{
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          Pengaturan lanjutan
        </summary>
        <div className="mm-params" style={{ marginTop: 10 }}>
          <NumericInput
            id="take-profit"
            label="Take profit"
            value={state.takeProfit}
            onChange={(v) => update({ takeProfit: v })}
            prefix="Rp"
            min={1}
            max={10_000_000}
            snapOnBlur={snapToTick}
            error={errors.takeProfit ?? null}
            hint="opsional — untuk estimasi profit"
          />
          <NumericInput
            id="sell-fee"
            label="Fee jual (%)"
            value={state.sellFeePercent === 0 ? 0 : Math.round(state.sellFeePercent * 100)}
            onChange={(v) =>
              update({ sellFeePercent: v === null ? 0 : v / 100, sellFeeTouched: true })
            }
            suffix="/100 %"
            min={0}
            max={150}
            hint="mengikuti fee beli sampai diubah manual"
            error={errors.sellFeePercent ?? null}
          />
        </div>
      </details>
    </section>
  );
}
