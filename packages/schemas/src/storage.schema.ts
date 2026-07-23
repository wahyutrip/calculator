import { z } from 'zod';
import { existingPositionSchema, planInputSchema } from './plan.schema.js';

/** Persisted shapes. Validated on write AND on read-back. */

export const PLAN_STORE_VERSION = 1;

export const savedPlanSchema = z.object({
  id: z.string().min(1),
  ticker: z.string().nullable(),
  name: z.string().min(1).max(120),
  status: z.enum(['draft', 'filled']),
  input: planInputSchema,
  existing: existingPositionSchema.nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const planStoreSchema = z.object({
  version: z.literal(PLAN_STORE_VERSION),
  plans: z.array(savedPlanSchema),
});

export const prefsSchema = z.object({
  version: z.literal(1),
  theme: z.enum(['light', 'dark', 'system']).default('light'),
  recentTickers: z.array(z.string()).max(5).default([]),
  lastRiskPercent: z.number().nullable().default(null),
  lastBuyFeePercent: z.number().nullable().default(null),
});

export type SavedPlanDto = z.infer<typeof savedPlanSchema>;
export type PlanStoreDto = z.infer<typeof planStoreSchema>;
export type PrefsDto = z.infer<typeof prefsSchema>;
