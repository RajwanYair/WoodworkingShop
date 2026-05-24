/**
 * Export Preset Profiles — Sprint 14
 *
 * Tests for src/utils/export-presets.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePreset,
  loadPreset,
  deletePreset,
  listPresets,
  listUserPresets,
  userPresetCount,
  BUILTIN_PRESETS,
} from '../../src/utils/export-presets';
import type { GcodePresetSettings, DxfPresetSettings } from '../../src/utils/export-presets';

// Wipe user presets between tests by deleting and re-seeding
async function resetPresets() {
  const { keys, del, createStore } = await import('idb-keyval');
  const store = createStore('cabinet-planner-export-presets', 'presets');
  const allKeys = await keys(store);
  await Promise.all(allKeys.map((k) => del(k as string, store)));
}

// ── Built-in presets ──────────────────────────────────────────────────────────

describe('BUILTIN_PRESETS', () => {
  it('contains at least 4 presets', () => {
    expect(BUILTIN_PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it('all have builtin: key prefix', () => {
    expect(BUILTIN_PRESETS.every((p) => p.key.startsWith('builtin:'))).toBe(true);
  });

  it('all have valid format field', () => {
    const valid = new Set(['gcode', 'dxf', 'bom']);
    expect(BUILTIN_PRESETS.every((p) => valid.has(p.format))).toBe(true);
  });

  it('includes a Grbl G-code preset', () => {
    const grbl = BUILTIN_PRESETS.find((p) => p.key === 'builtin:gcode-grbl');
    expect(grbl).toBeDefined();
    expect(grbl!.format).toBe('gcode');
  });

  it('includes a DXF preset', () => {
    expect(BUILTIN_PRESETS.some((p) => p.format === 'dxf')).toBe(true);
  });
});

// ── savePreset ────────────────────────────────────────────────────────────────

describe('savePreset', () => {
  beforeEach(resetPresets);

  it('saves a gcode preset and returns it', async () => {
    const settings: GcodePresetSettings = { feedRate: 2000, passDepth: 4 };
    const preset = await savePreset('My Grbl', 'gcode', settings);
    expect(preset.name).toBe('My Grbl');
    expect(preset.format).toBe('gcode');
    expect(preset.key).toMatch(/^user:/);
  });

  it('saves a DXF preset', async () => {
    const settings: DxfPresetSettings = { includeDimensions: false };
    const preset = await savePreset('CAM Only', 'dxf', settings);
    expect(preset.format).toBe('dxf');
  });

  it('throws when name is empty', async () => {
    await expect(savePreset('', 'gcode', {})).rejects.toThrow();
    await expect(savePreset('   ', 'gcode', {})).rejects.toThrow();
  });

  it('replaces existing preset with same derived key', async () => {
    await savePreset('My Preset', 'gcode', { feedRate: 1000 });
    await savePreset('My Preset', 'gcode', { feedRate: 9999 });
    const count = await userPresetCount();
    expect(count).toBe(1);
    const preset = await loadPreset('user:my-preset');
    expect((preset!.settings as GcodePresetSettings).feedRate).toBe(9999);
  });

  it('sets savedAt to a valid ISO timestamp', async () => {
    const preset = await savePreset('Ts Test', 'bom', {});
    expect(() => new Date(preset.savedAt).toISOString()).not.toThrow();
  });
});

// ── loadPreset ────────────────────────────────────────────────────────────────

describe('loadPreset', () => {
  beforeEach(resetPresets);

  it('returns null for unknown key', async () => {
    expect(await loadPreset('user:ghost')).toBeNull();
  });

  it('returns built-in preset by key', async () => {
    const preset = await loadPreset('builtin:gcode-grbl');
    expect(preset).not.toBeNull();
    expect(preset!.name).toContain('Grbl');
  });

  it('returns saved user preset by key', async () => {
    await savePreset('Load Me', 'gcode', { feedRate: 1234 });
    const preset = await loadPreset('user:load-me');
    expect(preset).not.toBeNull();
    expect((preset!.settings as GcodePresetSettings).feedRate).toBe(1234);
  });
});

// ── deletePreset ──────────────────────────────────────────────────────────────

describe('deletePreset', () => {
  beforeEach(resetPresets);

  it('deletes a user preset', async () => {
    await savePreset('Delete Me', 'gcode', {});
    await deletePreset('user:delete-me');
    expect(await loadPreset('user:delete-me')).toBeNull();
  });

  it('silently ignores unknown key', async () => {
    await expect(deletePreset('user:ghost')).resolves.toBeUndefined();
  });

  it('does not delete built-in presets', async () => {
    await deletePreset('builtin:gcode-grbl');
    const preset = await loadPreset('builtin:gcode-grbl');
    expect(preset).not.toBeNull();
  });
});

// ── listPresets ───────────────────────────────────────────────────────────────

describe('listPresets', () => {
  beforeEach(resetPresets);

  it('returns all built-ins when no user presets exist', async () => {
    const all = await listPresets();
    expect(all.length).toBeGreaterThanOrEqual(BUILTIN_PRESETS.length);
  });

  it('includes user presets alongside built-ins', async () => {
    await savePreset('UserGcode', 'gcode', {});
    const all = await listPresets();
    expect(all.some((p) => p.key === 'user:usergcode')).toBe(true);
  });

  it('filters by format', async () => {
    await savePreset('UserDxf', 'dxf', {});
    const gcodeOnly = await listPresets({ format: 'gcode' });
    expect(gcodeOnly.every((p) => p.format === 'gcode')).toBe(true);
    const dxfOnly = await listPresets({ format: 'dxf' });
    expect(dxfOnly.every((p) => p.format === 'dxf')).toBe(true);
  });
});

// ── listUserPresets ───────────────────────────────────────────────────────────

describe('listUserPresets', () => {
  beforeEach(resetPresets);

  it('returns empty when no user presets exist', async () => {
    expect(await listUserPresets()).toHaveLength(0);
  });

  it('returns only user presets (no built-ins)', async () => {
    await savePreset('User A', 'gcode', {});
    await savePreset('User B', 'dxf', {});
    const userPresets = await listUserPresets();
    expect(userPresets).toHaveLength(2);
    expect(userPresets.every((p) => p.key.startsWith('user:'))).toBe(true);
  });
});

// ── userPresetCount ───────────────────────────────────────────────────────────

describe('userPresetCount', () => {
  beforeEach(resetPresets);

  it('returns 0 initially', async () => {
    expect(await userPresetCount()).toBe(0);
  });

  it('increments after each save', async () => {
    await savePreset('P1', 'gcode', {});
    expect(await userPresetCount()).toBe(1);
    await savePreset('P2', 'dxf', {});
    expect(await userPresetCount()).toBe(2);
  });

  it('decrements after delete', async () => {
    await savePreset('To Delete', 'gcode', {});
    await deletePreset('user:to-delete');
    expect(await userPresetCount()).toBe(0);
  });
});
