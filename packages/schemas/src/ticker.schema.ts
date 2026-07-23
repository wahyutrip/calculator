import { z } from 'zod';

export const tickerSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1),
  sector: z.string().default(''),
  board: z.string().default(''),
  /** Delisted tickers stay in the file so saved plans keep rendering a name. */
  delisted: z.boolean().optional().default(false),
});

export const tickerFileSchema = z.object({
  updatedAt: z.string(),
  count: z.number().int().nonnegative(),
  tickers: z.array(tickerSchema),
});

export type Ticker = z.infer<typeof tickerSchema>;
export type TickerFile = z.infer<typeof tickerFileSchema>;
