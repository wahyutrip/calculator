import type { SavedPlanDto } from '@mm/schemas';

/**
 * The seam that makes Phase 2 a swap rather than a rewrite.
 *
 * Async even though localStorage is synchronous: making it sync now would force
 * every call site to be rewritten when the API arrives. The cost today is one
 * `await`.
 */
export interface PlanRepository {
  list(): Promise<SavedPlanDto[]>;
  get(id: string): Promise<SavedPlanDto | null>;
  save(plan: SavedPlanDto): Promise<SavedPlanDto>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export class StorageFullError extends Error {
  constructor() {
    super('Penyimpanan browser penuh. Hapus beberapa rencana lama.');
    this.name = 'StorageFullError';
  }
}
