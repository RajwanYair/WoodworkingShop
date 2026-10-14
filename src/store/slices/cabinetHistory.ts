import type { CabinetEntry } from './cabinetTypes';

export const MAX_CABINET_HISTORY = 50;

interface CabinetEntryChange {
  index: number;
  before?: CabinetEntry;
  after?: CabinetEntry;
}

export interface CabinetPatch {
  previousLength: number;
  nextLength: number;
  changes: CabinetEntryChange[];
}

export function createCabinetPatch(previous: CabinetEntry[], next: CabinetEntry[]): CabinetPatch {
  const changes: CabinetEntryChange[] = [];
  const length = Math.max(previous.length, next.length);

  for (let index = 0; index < length; index += 1) {
    const before = previous[index];
    const after = next[index];
    if (before !== after) changes.push({ index, before, after });
  }

  return { previousLength: previous.length, nextLength: next.length, changes };
}

export function appendCabinetPatch(history: CabinetPatch[], previous: CabinetEntry[], next: CabinetEntry[]) {
  return [...history, createCabinetPatch(previous, next)].slice(-MAX_CABINET_HISTORY);
}

export function applyCabinetPatch(cabinets: CabinetEntry[], patch: CabinetPatch, direction: 'forward' | 'backward') {
  const targetLength = direction === 'forward' ? patch.nextLength : patch.previousLength;
  const result = cabinets.slice(0, targetLength);

  for (const change of patch.changes) {
    const entry = direction === 'forward' ? change.after : change.before;
    if (entry !== undefined && change.index < targetLength) result[change.index] = entry;
  }

  for (const [index, entry] of result.entries()) {
    if (entry === undefined) throw new Error(`Cabinet patch did not restore entry ${index}`);
  }

  return result;
}
