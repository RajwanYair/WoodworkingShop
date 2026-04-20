import { DEFAULT_CONFIG } from '../src/engine/materials';
import type { CabinetConfig, CutRect, CutSheet } from '../src/engine/types';

/** Build a CabinetConfig by spreading overrides onto DEFAULT_CONFIG. */
export function cfg(overrides: Partial<CabinetConfig> = {}): CabinetConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** Reusable mock CutRect for export tests. */
export const mockPart: CutRect = {
  partId: 'P01',
  label: 'Side Panel',
  x: 10,
  y: 10,
  width: 300,
  length: 600,
  grainVertical: true,
};

/** Reusable mock CutSheet for export tests. */
export const mockSheet: CutSheet = {
  sheetIndex: 0,
  material: 'melamine-18',
  thickness: 18,
  sheetWidth: 2440,
  sheetLength: 1220,
  parts: [mockPart],
  yieldPercent: 95,
};
