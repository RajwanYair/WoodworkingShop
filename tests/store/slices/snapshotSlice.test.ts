/**
 * Phase 11 — snapshotSlice unit tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSnapshotSlice,
  loadSnapshotsFromStorage,
  persistSnapshots,
  type SnapshotSlice,
  type ProjectSnapshot,
} from '../../../src/store/slices/snapshotSlice';
import type { CabinetEntry } from '../../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../../src/engine/materials';

// ── localStorage stub ──────────────────────────────────────────────────────
const _lsData: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => _lsData[k] ?? null,
  setItem: (k: string, v: string) => {
    _lsData[k] = v;
  },
  removeItem: (k: string) => {
    delete _lsData[k];
  },
  clear: () => {
    for (const k of Object.keys(_lsData)) delete _lsData[k];
  },
};
vi.stubGlobal('localStorage', localStorageMock);
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });

// ── helpers ───────────────────────────────────────────────────────────────────

const CABINET: CabinetEntry = { name: 'C1', config: DEFAULT_CONFIG };

function makeSlice(initial: ProjectSnapshot[] = [], onRestore = vi.fn()) {
  let state: SnapshotSlice;
  const set = (partial: Partial<SnapshotSlice> | ((s: SnapshotSlice) => Partial<SnapshotSlice>)) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...patch };
  };
  const get = () => state;
  state = createSnapshotSlice(
    set as Parameters<typeof createSnapshotSlice>[0],
    get as Parameters<typeof createSnapshotSlice>[1],
    initial,
    () => [CABINET],
    onRestore,
  );
  return { get: () => state, onRestore };
}

// ── loadSnapshotsFromStorage / persistSnapshots ───────────────────────────────

describe('loadSnapshotsFromStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty array when nothing stored', () => {
    expect(loadSnapshotsFromStorage()).toEqual([]);
  });

  it('returns malformed-JSON as empty array', () => {
    localStorage.setItem('woodworkingshop:snapshots', '{bad}');
    expect(loadSnapshotsFromStorage()).toEqual([]);
  });
});

describe('persistSnapshots', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips snapshots through localStorage', () => {
    const snap: ProjectSnapshot = { id: 's1', name: 'Test', cabinets: [CABINET], timestamp: '2026-01-01T00:00:00Z' };
    persistSnapshots([snap]);
    expect(loadSnapshotsFromStorage()).toEqual([snap]);
  });
});

// ── createSnapshotSlice — initial state ──────────────────────────────────────

describe('createSnapshotSlice — initial state', () => {
  it('starts with provided snapshots', () => {
    const snap: ProjectSnapshot = { id: 's1', name: 'A', cabinets: [], timestamp: '2026-01-01T00:00:00Z' };
    expect(makeSlice([snap]).get().snapshots).toHaveLength(1);
  });

  it('starts empty when no initial snapshots', () => {
    expect(makeSlice().get().snapshots).toHaveLength(0);
  });
});

// ── saveSnapshot ─────────────────────────────────────────────────────────────

describe('createSnapshotSlice — saveSnapshot', () => {
  beforeEach(() => localStorage.clear());

  it('adds a new snapshot to the list', () => {
    const { get } = makeSlice();
    get().saveSnapshot('First');
    expect(get().snapshots).toHaveLength(1);
    expect(get().snapshots[0].name).toBe('First');
  });

  it('auto-generates a name when blank string given', () => {
    const { get } = makeSlice();
    get().saveSnapshot('');
    expect(get().snapshots[0].name).toMatch(/^Snapshot \d{4}-\d{2}-\d{2}/);
  });

  it('assigns unique IDs across multiple saves', () => {
    const { get } = makeSlice();
    get().saveSnapshot('A');
    // Ensure at least 1 ms apart so Date.now() differs
    vi.useFakeTimers();
    vi.advanceTimersByTime(2);
    get().saveSnapshot('B');
    vi.useRealTimers();
    const [a, b] = get().snapshots;
    expect(a.id).not.toBe(b.id);
  });

  it('persists to localStorage', () => {
    const { get } = makeSlice();
    get().saveSnapshot('Saved');
    expect(loadSnapshotsFromStorage()).toHaveLength(1);
  });
});

// ── restoreSnapshot ───────────────────────────────────────────────────────────

describe('createSnapshotSlice — restoreSnapshot', () => {
  it('calls onRestore with the snapshot cabinets', () => {
    const snap: ProjectSnapshot = { id: 'r1', name: 'R', cabinets: [CABINET], timestamp: '2026-01-01T00:00:00Z' };
    const { get, onRestore } = makeSlice([snap]);
    get().restoreSnapshot('r1');
    expect(onRestore).toHaveBeenCalledOnce();
    expect(onRestore).toHaveBeenCalledWith([CABINET]);
  });

  it('does nothing for unknown id', () => {
    const { get, onRestore } = makeSlice();
    get().restoreSnapshot('unknown');
    expect(onRestore).not.toHaveBeenCalled();
  });
});

// ── deleteSnapshot ────────────────────────────────────────────────────────────

describe('createSnapshotSlice — deleteSnapshot', () => {
  beforeEach(() => localStorage.clear());

  it('removes the snapshot by id', () => {
    const snap: ProjectSnapshot = { id: 'd1', name: 'D', cabinets: [], timestamp: '2026-01-01T00:00:00Z' };
    const { get } = makeSlice([snap]);
    get().deleteSnapshot('d1');
    expect(get().snapshots).toHaveLength(0);
  });

  it('persists the updated list', () => {
    const snap: ProjectSnapshot = { id: 'd2', name: 'D', cabinets: [], timestamp: '2026-01-01T00:00:00Z' };
    const { get } = makeSlice([snap]);
    get().deleteSnapshot('d2');
    expect(loadSnapshotsFromStorage()).toHaveLength(0);
  });

  it('is a no-op for unknown id', () => {
    const snap: ProjectSnapshot = { id: 'x1', name: 'X', cabinets: [], timestamp: '2026-01-01T00:00:00Z' };
    const { get } = makeSlice([snap]);
    get().deleteSnapshot('missing');
    expect(get().snapshots).toHaveLength(1);
  });
});
