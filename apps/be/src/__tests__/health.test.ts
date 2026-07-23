import { describe, expect, it } from 'vitest';
import { HealthController } from '../health/health.controller';
import { loadEnv } from '../config/env';

describe('HealthController', () => {
  it('reports liveness', () => {
    const res = new HealthController().liveness();
    expect(res.status).toBe('ok');
    expect(res.uptime).toBeGreaterThanOrEqual(0);
  });

  it('reports readiness honestly while there is no database', () => {
    // Claiming to have checked a datastore we do not have would be a lie the
    // moment Phase 2 relies on it.
    expect(new HealthController().readiness().checks.database).toBe('not-configured');
  });
});

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv({} as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('coerces PORT from a string', () => {
    expect(loadEnv({ PORT: '4210' } as NodeJS.ProcessEnv).PORT).toBe(4210);
  });

  it('fails loudly and names the offending variable', () => {
    expect(() => loadEnv({ PORT: 'not-a-number' } as NodeJS.ProcessEnv)).toThrow(/PORT/);
    expect(() => loadEnv({ NODE_ENV: 'staging' } as NodeJS.ProcessEnv)).toThrow(/NODE_ENV/);
  });
});
