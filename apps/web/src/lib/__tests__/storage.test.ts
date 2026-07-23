import type { SavedPlanDto } from '@mm/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LocalStoragePlanRepository,
  PLANS_CORRUPT_KEY,
  PLANS_KEY,
} from '../storage/local-storage-repository';
import { StorageFullError } from '../storage/plan-repository';

const plan: SavedPlanDto = {
  id: 'plan-1',
  ticker: 'BREN',
  name: 'BREN 23 Jul',
  status: 'draft',
  input: {
    ticker: 'BREN',
    entries: [1000, 900, 800, 700],
    stopLoss: 600,
    riskPercent: 1,
    buyFeePercent: 0.4,
    sellFeePercent: 0.5,
    balance: 10_000_000,
    takeProfit: 1400,
    existing: null,
  },
  existing: null,
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
};

describe('LocalStoragePlanRepository', () => {
  let repo: LocalStoragePlanRepository;

  beforeEach(() => {
    window.localStorage.clear();
    repo = new LocalStoragePlanRepository();
  });

  it('round-trips a plan', async () => {
    await repo.save(plan);
    const again = new LocalStoragePlanRepository();
    expect(await again.get('plan-1')).toEqual(plan);
    expect(await again.list()).toHaveLength(1);
  });

  it('treats an absent key as empty, not an error', async () => {
    expect(await repo.list()).toEqual([]);
    expect(await repo.get('nope')).toBeNull();
  });

  it('updates in place rather than duplicating', async () => {
    await repo.save(plan);
    await repo.save({ ...plan, name: 'Renamed' });
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe('Renamed');
  });

  it('removes a plan', async () => {
    await repo.save(plan);
    await repo.remove('plan-1');
    expect(await repo.list()).toEqual([]);
  });

  it('quarantines an unparseable blob instead of discarding it', async () => {
    window.localStorage.setItem(PLANS_KEY, '{not json');
    expect(await repo.list()).toEqual([]);
    // Someone's trading plans are worth more than a clean key.
    expect(window.localStorage.getItem(PLANS_CORRUPT_KEY)).toBe('{not json');
  });

  it('quarantines a structurally invalid store', async () => {
    const bad = JSON.stringify({ version: 1, plans: [{ id: 'x' }] });
    window.localStorage.setItem(PLANS_KEY, bad);
    expect(await repo.list()).toEqual([]);
    expect(window.localStorage.getItem(PLANS_CORRUPT_KEY)).toBe(bad);
  });

  it('treats an unknown future version as corrupt rather than parsing optimistically', async () => {
    const future = JSON.stringify({ version: 2, plans: [] });
    window.localStorage.setItem(PLANS_KEY, future);
    expect(await repo.list()).toEqual([]);
    expect(window.localStorage.getItem(PLANS_CORRUPT_KEY)).toBe(future);
  });

  it('surfaces a quota error without truncating what is already saved', async () => {
    await repo.save(plan);
    const before = window.localStorage.getItem(PLANS_KEY);

    const quota = new DOMException('full', 'QuotaExceededError');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quota;
    });

    await expect(repo.save({ ...plan, id: 'plan-2' })).rejects.toBeInstanceOf(StorageFullError);
    spy.mockRestore();
    expect(window.localStorage.getItem(PLANS_KEY)).toBe(before);
  });

  it('sorts the list newest first', async () => {
    await repo.save({ ...plan, id: 'old', updatedAt: '2026-01-01T00:00:00.000Z' });
    await repo.save({ ...plan, id: 'new', updatedAt: '2026-07-23T00:00:00.000Z' });
    expect((await repo.list()).map((p) => p.id)).toEqual(['new', 'old']);
  });
});
