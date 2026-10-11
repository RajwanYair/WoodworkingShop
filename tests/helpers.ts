import { DEFAULT_CONFIG } from '../src/engine/materials';
import type { CabinetConfig, CutRect, CutSheet, HardwareItem, Material, OptimizationResult } from '../src/engine/types';
import type { CabinetEntry } from '../src/store/cabinet-store';
import type { ExportOutput } from '../src/utils/batch-export-runner';
import type { SavedProject } from '../src/utils/project-storage';

/** Build a CabinetConfig by spreading overrides onto DEFAULT_CONFIG. */
export function cfg(overrides: Partial<CabinetConfig> = {}): CabinetConfig {
  return structuredClone({ ...DEFAULT_CONFIG, ...overrides });
}

export function makeCabinetEntry(overrides: Partial<CabinetEntry> = {}): CabinetEntry {
  return structuredClone({ name: 'Cabinet 1', config: cfg(), ...overrides });
}

export function makeMaterial(overrides: Partial<Material> = {}): Material {
  return structuredClone({
    key: 'melamine-18',
    name: { en: 'Melamine 18 mm', he: 'Melamine 18 mm' },
    thickness: 18,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 165,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#F5F0E8',
    hasGrain: false,
    densityKgM3: 700,
    ...overrides,
  } satisfies Material);
}

export function makeHardwareItem(overrides: Partial<HardwareItem> = {}): HardwareItem {
  return structuredClone({
    id: 'H01',
    name: { en: 'Hinge', he: 'Hinge' },
    qty: 2,
    unit: { en: 'pcs', he: 'pcs' },
    ...overrides,
  });
}

export function makeCutRect(overrides: Partial<CutRect> = {}): CutRect {
  return {
    partId: 'P01',
    label: 'Side Panel',
    x: 10,
    y: 10,
    width: 300,
    length: 600,
    grainVertical: true,
    ...overrides,
  };
}

export function makeCutSheet(overrides: Partial<CutSheet> = {}): CutSheet {
  return structuredClone({
    sheetIndex: 0,
    material: 'melamine-18',
    thickness: 18,
    sheetWidth: 2440,
    sheetLength: 1220,
    parts: [makeCutRect()],
    yieldPercent: 95,
    ...overrides,
  });
}

export function makeOptimizationResult(overrides: Partial<OptimizationResult> = {}): OptimizationResult {
  return structuredClone({
    sheets: [makeCutSheet()],
    totalSheets: 1,
    overallYield: 95,
    totalWaste: 100_000,
    grainConflictCount: 0,
    ...overrides,
  });
}

export function makeSavedProject(overrides: Partial<SavedProject> = {}): SavedProject {
  return structuredClone({
    id: 'project-1',
    name: 'Test Project',
    savedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: '1.0',
    cabinets: [makeCabinetEntry()],
    ...overrides,
  } satisfies SavedProject);
}

export function makeExportOutput(overrides: Partial<ExportOutput> = {}): ExportOutput {
  return structuredClone({
    content: 'test export',
    filename: 'test-export.csv',
    mimeType: 'text/csv',
    ...overrides,
  });
}

const mockPart: CutRect = Object.freeze(makeCutRect());
const mutableMockSheet: CutSheet = {
  sheetIndex: 0,
  material: 'melamine-18',
  thickness: 18,
  sheetWidth: 2440,
  sheetLength: 1220,
  parts: [mockPart],
  yieldPercent: 95,
};
Object.freeze(mutableMockSheet.parts);

/** Immutable compatibility fixture for tests that need a standard CutSheet. */
export const mockSheet: CutSheet = Object.freeze(mutableMockSheet);
