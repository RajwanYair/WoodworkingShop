/**
 * Export Preset Profiles — Sprint 14
 *
 * Save and restore named export-settings presets for G-code, DXF, and BOM
 * exports.  Presets are stored in IndexedDB and survive browser restarts.
 *
 * Built-in presets (read-only, key prefix 'builtin:') ship with the app and
 * cover the most common CNC controller setups.  User presets (key prefix
 * 'user:') are created, updated, and deleted interactively.
 */

import { get, set, del, keys, createStore } from 'idb-keyval';
import type { GcodeOptions } from './gcode-export';

// ── IDB store ─────────────────────────────────────────────────────────────────
const presetStore = createStore('cabinet-planner-export-presets', 'presets');

// ── Types ─────────────────────────────────────────────────────────────────────

/** Which export format this preset applies to. */
export type ExportFormat = 'gcode' | 'dxf' | 'bom';

/** G-code preset settings (subset of GcodeOptions). */
export type GcodePresetSettings = Partial<GcodeOptions>;

/** DXF preset settings. */
export interface DxfPresetSettings {
  /** Include DIMENSION entities. Default true. */
  includeDimensions?: boolean;
  /** Include grain-direction layer. Default true. */
  includeGrainLayer?: boolean;
  /** Scale factor (default 1.0 = 1 mm per DXF unit). */
  scale?: number;
}

/** BOM preset settings. */
export interface BomPresetSettings {
  /** Currency code for price columns. Default 'USD'. */
  currencyCode?: string;
  /** Include hardware items. Default true. */
  includeHardware?: boolean;
  /** Include edge banding summary. Default true. */
  includeEdgeBanding?: boolean;
  /** Group by material. Default true. */
  groupByMaterial?: boolean;
}

export type PresetSettings = GcodePresetSettings | DxfPresetSettings | BomPresetSettings;

export interface ExportPreset {
  /** Unique key, e.g. 'user:grbl-v1' or 'builtin:linuxcnc'. */
  key: string;
  /** User-visible name. */
  name: string;
  /** Which export format these settings apply to. */
  format: ExportFormat;
  /** Export settings payload. */
  settings: PresetSettings;
  /** ISO timestamp when the preset was created/updated. */
  savedAt: string;
  /** Whether this is a built-in preset (cannot be deleted). */
  readonly builtin?: boolean;
}

// ── Built-in presets ──────────────────────────────────────────────────────────

export const BUILTIN_PRESETS: readonly ExportPreset[] = [
  {
    key: 'builtin:gcode-grbl',
    name: 'Grbl (115200, 3mm pass)',
    format: 'gcode',
    settings: {
      feedRate: 1500,
      plungeRate: 600,
      safeZ: 5,
      passDepth: 3,
      toolDiameter: 6,
      useArcs: false,
      emitToolChange: false,
    } satisfies GcodePresetSettings,
    savedAt: '2025-01-01T00:00:00Z',
    builtin: true,
  },
  {
    key: 'builtin:gcode-mach3',
    name: 'Mach3 (tool-change enabled)',
    format: 'gcode',
    settings: {
      feedRate: 2000,
      plungeRate: 500,
      safeZ: 8,
      passDepth: 4,
      toolDiameter: 6,
      useArcs: true,
      emitToolChange: true,
    } satisfies GcodePresetSettings,
    savedAt: '2025-01-01T00:00:00Z',
    builtin: true,
  },
  {
    key: 'builtin:gcode-linuxcnc',
    name: 'LinuxCNC (arcs, 2mm pass)',
    format: 'gcode',
    settings: {
      feedRate: 1200,
      plungeRate: 400,
      safeZ: 5,
      passDepth: 2,
      toolDiameter: 6,
      useArcs: true,
      emitToolChange: false,
    } satisfies GcodePresetSettings,
    savedAt: '2025-01-01T00:00:00Z',
    builtin: true,
  },
  {
    key: 'builtin:dxf-cadstandard',
    name: 'DXF CAD Standard (dimensions on)',
    format: 'dxf',
    settings: { includeDimensions: true, includeGrainLayer: true, scale: 1.0 } satisfies DxfPresetSettings,
    savedAt: '2025-01-01T00:00:00Z',
    builtin: true,
  },
  {
    key: 'builtin:dxf-cam',
    name: 'DXF CAM Only (no dimensions)',
    format: 'dxf',
    settings: { includeDimensions: false, includeGrainLayer: false, scale: 1.0 } satisfies DxfPresetSettings,
    savedAt: '2025-01-01T00:00:00Z',
    builtin: true,
  },
  {
    key: 'builtin:bom-usd',
    name: 'BOM (USD, all items)',
    format: 'bom',
    settings: {
      currencyCode: 'USD',
      includeHardware: true,
      includeEdgeBanding: true,
      groupByMaterial: true,
    } satisfies BomPresetSettings,
    savedAt: '2025-01-01T00:00:00Z',
    builtin: true,
  },
] as const;

// ── IDB key helpers ───────────────────────────────────────────────────────────

const USER_PREFIX = 'user:';

function _userKey(name: string): string {
  return (
    USER_PREFIX +
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
  );
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Save a new user preset.  The key is auto-derived from `name` with `user:` prefix.
 * If a preset with the same key already exists it is replaced.
 *
 * @throws When `name` is empty.
 */
export async function savePreset(name: string, format: ExportFormat, settings: PresetSettings): Promise<ExportPreset> {
  if (!name.trim()) throw new Error('Preset name must not be empty');
  const key = _userKey(name);
  const preset: ExportPreset = {
    key,
    name: name.trim(),
    format,
    settings,
    savedAt: new Date().toISOString(),
  };
  await set(key, preset, presetStore);
  return preset;
}

/** Load a preset by key.  Returns `null` when not found. */
export async function loadPreset(key: string): Promise<ExportPreset | null> {
  // Check built-ins first
  const builtin = BUILTIN_PRESETS.find((p) => p.key === key);
  if (builtin) return builtin;
  const stored = await get<ExportPreset>(key, presetStore);
  return stored ?? null;
}

/** Delete a user preset by key.  Silently ignores unknown keys and built-ins. */
export async function deletePreset(key: string): Promise<void> {
  if (BUILTIN_PRESETS.some((p) => p.key === key)) return; // built-ins are read-only
  await del(key, presetStore);
}

/** List all presets (built-in + user) optionally filtered by format. */
export async function listPresets(filter?: { format?: ExportFormat }): Promise<ExportPreset[]> {
  const allKeys = (await keys(presetStore)) as string[];
  const userPresets = (
    await Promise.all(
      allKeys
        .filter((k) => typeof k === 'string' && k.startsWith(USER_PREFIX))
        .map((k) => get<ExportPreset>(k, presetStore)),
    )
  ).filter((p): p is ExportPreset => p != null);

  const all: ExportPreset[] = [...BUILTIN_PRESETS, ...userPresets];
  if (filter?.format) {
    return all.filter((p) => p.format === filter.format);
  }
  return all;
}

/** Return all user-created presets (excludes built-ins). */
export async function listUserPresets(): Promise<ExportPreset[]> {
  const allKeys = (await keys(presetStore)) as string[];
  const stored = await Promise.all(
    allKeys
      .filter((k) => typeof k === 'string' && k.startsWith(USER_PREFIX))
      .map((k) => get<ExportPreset>(k, presetStore)),
  );
  return stored.filter((p): p is ExportPreset => p != null);
}

/** Total number of user presets stored in IDB. */
export async function userPresetCount(): Promise<number> {
  const k = await keys(presetStore);
  return k.filter((key) => typeof key === 'string' && (key as string).startsWith(USER_PREFIX)).length;
}
