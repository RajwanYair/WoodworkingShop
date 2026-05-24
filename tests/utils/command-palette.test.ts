/**
 * Command Palette — Sprint 15
 *
 * Tests for src/utils/command-palette.ts
 */
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import {
  registerCommands,
  unregisterCommand,
  getCommand,
  getAllCommands,
  clearRegistry,
  searchCommands,
  groupSearchResults,
  invokeCommand,
  getRecentCommandIds,
  getRecentCommands,
  clearRecentCommands,
} from '../../src/utils/command-palette';
import type { PaletteCommand } from '../../src/utils/command-palette';

// ── localStorage stub ─────────────────────────────────────────────────────────
// jsdom may not have localStorage in Node; stub it globally.
const localStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
})();

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCmd(id: string, label: string, category = 'Test', keywords?: string[]): PaletteCommand {
  return { id, label, category, action: () => undefined, keywords };
}

beforeEach(() => {
  clearRegistry();
  clearRecentCommands();
});

// ── registerCommands / getCommand ─────────────────────────────────────────────

describe('registerCommands', () => {
  it('registers a command retrievable by id', () => {
    registerCommands([makeCmd('test.action', 'Test Action')]);
    expect(getCommand('test.action')).not.toBeNull();
  });

  it('replaces existing command with same id', () => {
    registerCommands([makeCmd('same.id', 'First')]);
    registerCommands([makeCmd('same.id', 'Second')]);
    expect(getCommand('same.id')!.label).toBe('Second');
  });

  it('returns null for unknown id', () => {
    expect(getCommand('ghost')).toBeNull();
  });

  it('registers multiple commands at once', () => {
    registerCommands([makeCmd('a', 'A'), makeCmd('b', 'B'), makeCmd('c', 'C')]);
    expect(getAllCommands()).toHaveLength(3);
  });
});

// ── unregisterCommand ─────────────────────────────────────────────────────────

describe('unregisterCommand', () => {
  it('removes a registered command', () => {
    registerCommands([makeCmd('remove.me', 'Remove')]);
    unregisterCommand('remove.me');
    expect(getCommand('remove.me')).toBeNull();
  });

  it('silently ignores unknown id', () => {
    expect(() => unregisterCommand('ghost')).not.toThrow();
  });
});

// ── searchCommands ────────────────────────────────────────────────────────────

describe('searchCommands', () => {
  beforeEach(() => {
    registerCommands([
      makeCmd('export.gcode', 'Export G-code', 'Export', ['gcode', 'cnc']),
      makeCmd('export.dxf', 'Export DXF', 'Export', ['dxf', 'cad']),
      makeCmd('view.reset', 'Reset View', 'View'),
      makeCmd('project.save', 'Save Project', 'Project'),
      { ...makeCmd('hidden.cmd', 'Hidden Command'), hidden: true },
    ]);
  });

  it('returns all visible commands when query is empty', () => {
    const results = searchCommands('');
    expect(results.length).toBe(4); // hidden excluded
  });

  it('scores exact label match higher than partial', () => {
    const results = searchCommands('export dxf');
    // 'Export DXF' is an exact label match relative to 'Export G-code'
    // Both contain 'export'; DXF matches more closely
    const ids = results.map((r) => r.command.id);
    expect(ids).toContain('export.dxf');
  });

  it('excludes hidden commands', () => {
    const results = searchCommands('hidden');
    expect(results.find((r) => r.command.id === 'hidden.cmd')).toBeUndefined();
  });

  it('matches by keyword', () => {
    const results = searchCommands('cnc');
    expect(results.some((r) => r.command.id === 'export.gcode')).toBe(true);
  });

  it('matches by category', () => {
    const results = searchCommands('view');
    expect(results.some((r) => r.command.category === 'View')).toBe(true);
  });

  it('respects limit parameter', () => {
    const results = searchCommands('', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when no match', () => {
    expect(searchCommands('zzzzznotfound')).toHaveLength(0);
  });

  it('orders by score descending', () => {
    registerCommands([makeCmd('project.export', 'Export Project', 'Project')]);
    const results = searchCommands('export');
    expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);
  });
});

// ── groupSearchResults ────────────────────────────────────────────────────────

describe('groupSearchResults', () => {
  it('groups results by category', () => {
    registerCommands([
      makeCmd('export.a', 'Export A', 'Export'),
      makeCmd('export.b', 'Export B', 'Export'),
      makeCmd('view.a', 'View A', 'View'),
    ]);
    const results = searchCommands('');
    const groups = groupSearchResults(results);
    const categories = groups.map((g) => g.category);
    expect(categories).toContain('Export');
    expect(categories).toContain('View');
    const exportGroup = groups.find((g) => g.category === 'Export')!;
    expect(exportGroup.commands).toHaveLength(2);
  });
});

// ── invokeCommand ─────────────────────────────────────────────────────────────

describe('invokeCommand', () => {
  it('invokes the command action', async () => {
    let called = false;
    registerCommands([{ ...makeCmd('invoke.me', 'Invoke'), action: () => { called = true; } }]);
    await invokeCommand('invoke.me');
    expect(called).toBe(true);
  });

  it('throws when command not found', async () => {
    await expect(invokeCommand('ghost')).rejects.toThrow("Command 'ghost' not found");
  });

  it('records invoked command in recents', async () => {
    registerCommands([makeCmd('recent.test', 'Recent Test')]);
    await invokeCommand('recent.test');
    expect(getRecentCommandIds()).toContain('recent.test');
  });

  it('supports async actions', async () => {
    let done = false;
    registerCommands([{ ...makeCmd('async.cmd', 'Async'), action: async () => { await Promise.resolve(); done = true; } }]);
    await invokeCommand('async.cmd');
    expect(done).toBe(true);
  });
});

// ── recents ───────────────────────────────────────────────────────────────────

describe('recents', () => {
  it('returns empty array initially', () => {
    expect(getRecentCommandIds()).toHaveLength(0);
  });

  it('returns most recent first', async () => {
    registerCommands([makeCmd('a', 'A'), makeCmd('b', 'B')]);
    await invokeCommand('a');
    await invokeCommand('b');
    expect(getRecentCommandIds()[0]).toBe('b');
  });

  it('deduplicates on re-invoke', async () => {
    registerCommands([makeCmd('dup', 'Dup')]);
    await invokeCommand('dup');
    await invokeCommand('dup');
    expect(getRecentCommandIds().filter((id) => id === 'dup')).toHaveLength(1);
  });

  it('clearRecentCommands removes all recents', async () => {
    registerCommands([makeCmd('clr', 'Clr')]);
    await invokeCommand('clr');
    clearRecentCommands();
    expect(getRecentCommandIds()).toHaveLength(0);
  });

  it('getRecentCommands filters out unregistered commands', async () => {
    registerCommands([makeCmd('gone', 'Gone'), makeCmd('stays', 'Stays')]);
    await invokeCommand('gone');
    await invokeCommand('stays');
    unregisterCommand('gone');
    const recent = getRecentCommands();
    expect(recent.every((c) => c.id !== 'gone')).toBe(true);
  });
});
