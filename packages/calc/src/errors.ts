import type { CalcError, CalcErrorCode } from './types.js';

export function calcError(
  code: CalcErrorCode,
  values: Record<string, number> = {},
): { ok: false; error: CalcError } {
  return { ok: false, error: { code, values } };
}
