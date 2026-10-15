import type { CabinetEntry } from './cabinetTypes';

export const MAX_CABINET_HISTORY = 50;

type CabinetChange =
  | { op: 'set'; index: number; path: readonly string[]; before: unknown; after: unknown }
  | { op: 'add'; index: number; path: readonly string[]; value: unknown }
  | { op: 'remove'; index: number; path: readonly string[]; value: unknown }
  | { op: 'insert'; index: number; entry: CabinetEntry }
  | { op: 'delete'; index: number; entry: CabinetEntry };

export interface CabinetPatch {
  previousLength: number;
  nextLength: number;
  changes: CabinetChange[];
  permute?: { forward: readonly number[]; backward: readonly number[] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCabinetEntry(value: unknown): value is CabinetEntry {
  return isRecord(value) && typeof value.name === 'string' && isRecord(value.config);
}

function asCabinetEntry(value: unknown, index: number): CabinetEntry {
  if (!isCabinetEntry(value)) throw new Error(`Cabinet patch did not restore entry ${index}`);
  return value;
}

function permutationOrder(previous: readonly CabinetEntry[], next: readonly CabinetEntry[]): number[] | null {
  if (previous.length !== next.length || previous.length === 0) return null;
  const used = new Set<number>();
  const forward: number[] = [];

  for (const entry of next) {
    const source = previous.findIndex((candidate, index) => !used.has(index) && candidate === entry);
    if (source === -1) return null;
    used.add(source);
    forward.push(source);
  }

  return forward.every((index, position) => index === position) ? null : forward;
}

function inverseOrder(forward: readonly number[]): number[] {
  const backward = Array.from({ length: forward.length }, () => -1);
  forward.forEach((source, position) => {
    backward[source] = position;
  });
  return backward;
}

function diffValue(
  index: number,
  path: readonly string[],
  before: unknown,
  after: unknown,
  changes: CabinetChange[],
): void {
  if (Object.is(before, after)) return;

  if (isRecord(before) && isRecord(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort((left, right) =>
      left.localeCompare(right),
    );
    for (const key of keys) {
      const hasBefore = Object.hasOwn(before, key);
      const hasAfter = Object.hasOwn(after, key);
      const nextPath = [...path, key];
      if (!hasBefore) changes.push({ op: 'add', index, path: nextPath, value: after[key] });
      else if (!hasAfter) changes.push({ op: 'remove', index, path: nextPath, value: before[key] });
      else diffValue(index, nextPath, before[key], after[key], changes);
    }
    return;
  }

  changes.push({ op: 'set', index, path, before, after });
}

/**
 * Build a reversible structural patch.
 * Unchanged cabinet references are omitted, and a field edit stores only the changed path.
 */
export function createCabinetPatch(previous: readonly CabinetEntry[], next: readonly CabinetEntry[]): CabinetPatch {
  const forward = permutationOrder(previous, next);
  if (forward) {
    return {
      previousLength: previous.length,
      nextLength: next.length,
      changes: [],
      permute: { forward, backward: inverseOrder(forward) },
    };
  }

  const changes: CabinetChange[] = [];
  const length = Math.max(previous.length, next.length);
  for (let index = 0; index < length; index += 1) {
    const before = previous[index];
    const after = next[index];
    if (before === after) continue;
    if (before === undefined && after !== undefined) changes.push({ op: 'insert', index, entry: after });
    else if (before !== undefined && after === undefined) changes.push({ op: 'delete', index, entry: before });
    else if (before !== undefined && after !== undefined) diffValue(index, [], before, after, changes);
  }

  return { previousLength: previous.length, nextLength: next.length, changes };
}

export function appendCabinetPatch(
  history: readonly CabinetPatch[],
  previous: readonly CabinetEntry[],
  next: readonly CabinetEntry[],
): CabinetPatch[] {
  return [...history, createCabinetPatch(previous, next)].slice(-MAX_CABINET_HISTORY);
}

function setPath(root: unknown, path: readonly string[], value: unknown, remove: boolean): unknown {
  if (path.length === 0) return remove ? undefined : value;
  const [head, ...rest] = path;
  if (head === undefined) return root;
  const source = isRecord(root) ? root : {};
  const copy: Record<string, unknown> = { ...source };
  if (rest.length === 0) {
    if (remove) delete copy[head];
    else copy[head] = value;
    return copy;
  }
  copy[head] = setPath(copy[head], rest, value, remove);
  return copy;
}

function applyChange(result: CabinetEntry[], change: CabinetChange, direction: 'forward' | 'backward'): void {
  if (change.op === 'insert') {
    if (direction === 'forward') result[change.index] = change.entry;
    return;
  }
  if (change.op === 'delete') {
    if (direction === 'backward') result[change.index] = change.entry;
    return;
  }

  const current = result[change.index];
  if (current === undefined) throw new Error(`Cabinet patch did not restore entry ${change.index}`);

  if (change.op === 'set') {
    result[change.index] = asCabinetEntry(
      setPath(current, change.path, direction === 'forward' ? change.after : change.before, false),
      change.index,
    );
    return;
  }
  if (change.op === 'add') {
    result[change.index] = asCabinetEntry(
      setPath(current, change.path, change.value, direction === 'backward'),
      change.index,
    );
    return;
  }
  result[change.index] = asCabinetEntry(
    setPath(current, change.path, change.value, direction === 'forward'),
    change.index,
  );
}

export function applyCabinetPatch(
  cabinets: readonly CabinetEntry[],
  patch: CabinetPatch,
  direction: 'forward' | 'backward',
): CabinetEntry[] {
  if (patch.permute) {
    const order = direction === 'forward' ? patch.permute.forward : patch.permute.backward;
    return order.map((index) => {
      const entry = cabinets[index];
      if (entry === undefined) throw new Error(`Cabinet patch did not restore entry ${index}`);
      return entry;
    });
  }

  const targetLength = direction === 'forward' ? patch.nextLength : patch.previousLength;
  const result = cabinets.slice(0, targetLength);
  while (result.length < targetLength) result.push(undefined as unknown as CabinetEntry);

  for (const change of patch.changes) {
    if (change.index < targetLength || change.op === 'insert' || change.op === 'delete') {
      applyChange(result, change, direction);
    }
  }

  return result.map((entry, index) => asCabinetEntry(entry, index));
}

/** UTF-8 size of a history payload. Used to compare structural patches with full snapshots. */
export function measureSerializedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
