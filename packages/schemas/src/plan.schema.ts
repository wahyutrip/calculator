import {
  MAX_BALANCE,
  MAX_BUY_FEE_PERCENT,
  MAX_ENTRIES,
  MAX_RISK_PERCENT,
  MAX_SELL_FEE_PERCENT,
  MIN_BALANCE,
  MIN_RISK_PERCENT,
} from '@mm/calc';
import { z } from 'zod';

/**
 * Validation shared by the web form and the Phase 2 API, so a rule is written
 * once. Messages are the literal Indonesian copy that ships — not glosses.
 */

const rupiah = z
  .number({ message: 'Harga wajib diisi' })
  .int({ message: 'Harga harus bilangan bulat' })
  .min(1, { message: 'Harga minimal Rp 1' })
  .max(10_000_000, { message: 'Harga tidak masuk akal' });

export const entryPriceSchema = rupiah;

export const balanceSchema = z
  .number({ message: 'Balance wajib diisi' })
  .int({ message: 'Balance harus bilangan bulat' })
  .min(MIN_BALANCE, { message: `Balance minimal Rp ${MIN_BALANCE.toLocaleString('id-ID')}` })
  .max(MAX_BALANCE, { message: 'Balance tidak masuk akal' });

export const riskPercentSchema = z
  .number({ message: 'Risiko wajib diisi' })
  .min(MIN_RISK_PERCENT, { message: 'Risiko harus antara 0,1% dan 10%' })
  .max(MAX_RISK_PERCENT, { message: 'Risiko harus antara 0,1% dan 10%' });

export const buyFeeSchema = z
  .number({ message: 'Fee wajib diisi' })
  .min(0, { message: 'Fee harus antara 0% dan 1%' })
  .max(MAX_BUY_FEE_PERCENT, { message: 'Fee harus antara 0% dan 1%' });

export const sellFeeSchema = z
  .number({ message: 'Fee jual wajib diisi' })
  .min(0, { message: 'Fee jual harus antara 0% dan 1,5%' })
  .max(MAX_SELL_FEE_PERCENT, { message: 'Fee jual harus antara 0% dan 1,5%' });

export const existingPositionSchema = z.object({
  lots: z
    .number({ message: 'Lot dimiliki wajib diisi' })
    .int({ message: 'Lot harus bilangan bulat' })
    .min(1, { message: 'Lot dimiliki minimal 1' })
    .max(1_000_000, { message: 'Lot tidak masuk akal' }),
  avgPrice: rupiah,
});

export const planInputSchema = z
  .object({
    ticker: z.string().trim().toUpperCase().min(1).max(10).nullable().default(null),
    entries: z
      .array(entryPriceSchema)
      .min(1, { message: 'Minimal 1 entry' })
      .max(MAX_ENTRIES, { message: `Maksimal ${MAX_ENTRIES} entry` }),
    stopLoss: rupiah,
    riskPercent: riskPercentSchema,
    buyFeePercent: buyFeeSchema,
    sellFeePercent: sellFeeSchema,
    balance: balanceSchema,
    takeProfit: rupiah.nullable().default(null),
    existing: existingPositionSchema.nullable().default(null),
  })
  // Cross-field rules are refinements, not field rules, so the error attaches to
  // the field the user must actually change.
  .refine((v) => v.entries.every((e) => e > v.stopLoss), {
    message: 'SL harus di bawah semua harga entry',
    path: ['stopLoss'],
  })
  .refine((v) => new Set(v.entries).size === v.entries.length, {
    message: 'Harga entry tidak boleh sama',
    path: ['entries'],
  })
  .refine((v) => v.takeProfit === null || v.takeProfit > Math.max(...v.entries), {
    message: 'TP harus di atas harga entry tertinggi',
    path: ['takeProfit'],
  })
  .refine(
    (v) =>
      v.existing === null ||
      v.entries.every((e) => e < v.existing!.avgPrice) ||
      v.entries.every((e) => e > v.existing!.avgPrice),
    {
      message: 'Entry harus semuanya di bawah atau semuanya di atas harga rata-rata',
      path: ['entries'],
    },
  );

export type PlanInputDto = z.infer<typeof planInputSchema>;
