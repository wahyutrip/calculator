import { z } from 'zod';

/**
 * Config is validated at boot and fails LOUDLY with the offending variable
 * named. A silent fallback to a default is how the wrong database URL reaches
 * production.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // Optional until Phase 2 actually persists anything — the MVP has no database.
  DATABASE_URL: z.string().optional(),
  // Explicit allow-list. Never "*" once auth exists.
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}
