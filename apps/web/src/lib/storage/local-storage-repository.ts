import { PLAN_STORE_VERSION, planStoreSchema, savedPlanSchema, type SavedPlanDto } from '@mm/schemas';
import { StorageFullError, type PlanRepository } from './plan-repository';

export const PLANS_KEY = 'mm:plans:v1';
export const PLANS_CORRUPT_KEY = 'mm:plans:v1:corrupt';

interface Store {
  version: typeof PLAN_STORE_VERSION;
  plans: SavedPlanDto[];
}

const EMPTY: Store = { version: PLAN_STORE_VERSION, plans: [] };

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    // Some browsers throw on localStorage access rather than returning null
    // (Safari with cookies blocked). Treat it as "no storage", not a crash.
    return false;
  }
}

/**
 * Quarantine, never discard.
 *
 * Someone's trading plans are worth more than a clean key. Moving the bad blob
 * aside turns "my plans vanished" into a recoverable support request instead of
 * a shrug.
 */
function quarantine(raw: string): void {
  try {
    window.localStorage.setItem(PLANS_CORRUPT_KEY, raw);
  } catch {
    // If even the quarantine write fails there is nothing further to do; the
    // read path still returns an empty store and the app stays usable.
  }
}

function read(): Store {
  if (!hasStorage()) return { ...EMPTY, plans: [] };
  const raw = window.localStorage.getItem(PLANS_KEY);
  if (raw === null) return { ...EMPTY, plans: [] }; // absent is not an error

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    quarantine(raw);
    return { ...EMPTY, plans: [] };
  }

  // An unknown future version is treated as corrupt rather than parsed
  // optimistically — a newer shape read by older code is how data gets mangled.
  const result = planStoreSchema.safeParse(parsed);
  if (!result.success) {
    quarantine(raw);
    return { ...EMPTY, plans: [] };
  }
  return result.data;
}

function write(store: Store): void {
  if (!hasStorage()) return;
  // Validate BEFORE writing. Persisting a shape the reader will reject is a
  // self-inflicted corruption.
  const checked = planStoreSchema.parse(store);
  try {
    window.localStorage.setItem(PLANS_KEY, JSON.stringify(checked));
  } catch (e) {
    // A failed write must never truncate what is already saved, so nothing is
    // removed here — the existing store stays exactly as it was.
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      throw new StorageFullError();
    }
    throw e;
  }
}

export class LocalStoragePlanRepository implements PlanRepository {
  async list(): Promise<SavedPlanDto[]> {
    return read().plans.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<SavedPlanDto | null> {
    return read().plans.find((p) => p.id === id) ?? null;
  }

  async save(plan: SavedPlanDto): Promise<SavedPlanDto> {
    const checked = savedPlanSchema.parse(plan);
    const store = read();
    const i = store.plans.findIndex((p) => p.id === checked.id);
    if (i >= 0) store.plans[i] = checked;
    else store.plans.push(checked);
    write(store);
    return checked;
  }

  async remove(id: string): Promise<void> {
    const store = read();
    write({ ...store, plans: store.plans.filter((p) => p.id !== id) });
  }

  async clear(): Promise<void> {
    write({ ...EMPTY, plans: [] });
  }
}

export const planRepository: PlanRepository = new LocalStoragePlanRepository();
