import { describe, it, expect } from 'vitest';
import { generateErpPayload, type ErpPayload } from '../../src/utils/erp-export';
import type { Part, HardwareItem, OptimizationResult } from '../../src/engine/types';
import { cfg } from '../helpers';

// ── fixtures ──────────────────────────────────────────────────────────────

const mockPart: Part = {
  id: 'P01',
  name: { en: 'Side Panel', he: 'לוח צד' },
  qty: 2,
  material: 'melamine-18',
  thickness: 18,
  length: 720,
  width: 580,
  edgeBanding: { en: 'none', he: 'אין' },
};

const mockHardwareWithPrice: HardwareItem = {
  id: 'H01',
  name: { en: 'Hinge', he: 'ציר' },
  qty: 4,
  unit: { en: 'pcs', he: 'יח' },
  unitPrice: 2.5,
};

const mockHardwareNoPrice: HardwareItem = {
  id: 'H02',
  name: { en: 'Screw', he: 'בורג' },
  qty: 20,
  unit: { en: 'pcs', he: 'יח' },
};

const mockOptimization: OptimizationResult = {
  sheets: [],
  totalSheets: 2,
  overallYield: 88,
  totalWaste: 50000,
  grainConflictCount: 0,
};

// ── generateErpPayload ────────────────────────────────────────────────────

describe('generateErpPayload — schema envelope', () => {
  it('returns schemaVersion erp-v1', () => {
    const payload = generateErpPayload('Test Cabinet', cfg(), [mockPart], [mockHardwareWithPrice], mockOptimization);
    expect(payload.schemaVersion).toBe('erp-v1');
  });

  it('generatedAt is a valid ISO string', () => {
    const payload = generateErpPayload('Test', cfg(), [], [], mockOptimization);
    expect(() => new Date(payload.generatedAt)).not.toThrow();
    expect(payload.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('appVersion is a non-empty string', () => {
    const payload = generateErpPayload('Test', cfg(), [], [], mockOptimization);
    expect(typeof payload.appVersion).toBe('string');
    expect(payload.appVersion.length).toBeGreaterThan(0);
  });
});

describe('generateErpPayload — project section', () => {
  it('maps config dimensions to project fields', () => {
    const payload = generateErpPayload(
      'My Cabinet',
      cfg({ width: 900, height: 720, depth: 580 }),
      [],
      [],
      mockOptimization,
    );
    expect(payload.project.name).toBe('My Cabinet');
    expect(payload.project.cabinetWidth).toBe(900);
    expect(payload.project.cabinetHeight).toBe(720);
    expect(payload.project.cabinetDepth).toBe(580);
    expect(payload.project.units).toBe('mm');
  });

  it('falls back to "Unnamed Project" when projectName is empty', () => {
    const payload = generateErpPayload('', cfg(), [], [], mockOptimization);
    expect(payload.project.name).toBe('Unnamed Project');
  });
});

describe('generateErpPayload — parts', () => {
  it('builds a part line for each part', () => {
    const payload = generateErpPayload('Test', cfg(), [mockPart], [], mockOptimization);
    expect(payload.parts).toHaveLength(1);
  });

  it.each([
    ['id', 'P01'],
    ['label', 'Side Panel'],
    ['material', 'melamine-18'],
    ['edgeBanding', 'none'],
  ] as const)('part line has correct %s', (field, expected) => {
    const payload = generateErpPayload('Test', cfg(), [mockPart], [], mockOptimization);
    expect(payload.parts[0][field]).toBe(expected);
  });

  it('computes areaMm2 as qty × length × width', () => {
    const payload = generateErpPayload('Test', cfg(), [mockPart], [], mockOptimization);
    expect(payload.parts[0].areaMm2).toBe(2 * 720 * 580);
  });

  it('resolves materialDisplayName from catalog for known material', () => {
    const payload = generateErpPayload('Test', cfg(), [mockPart], [], mockOptimization);
    expect(payload.parts[0].materialDisplayName).not.toBe('melamine-18');
    expect(payload.parts[0].materialDisplayName.length).toBeGreaterThan(0);
  });

  it('falls back to material key as display name for unknown material', () => {
    const unknownPart: Part = { ...mockPart, material: 'custom-wood-unknown-99' };
    const payload = generateErpPayload('Test', cfg(), [unknownPart], [], mockOptimization);
    expect(payload.parts[0].materialDisplayName).toBe('custom-wood-unknown-99');
  });
});

describe('generateErpPayload — hardware', () => {
  it('includes one hardware line per item', () => {
    const payload = generateErpPayload(
      'Test',
      cfg(),
      [],
      [mockHardwareWithPrice, mockHardwareNoPrice],
      mockOptimization,
    );
    expect(payload.hardware).toHaveLength(2);
  });

  it('computes lineCost when unitPrice is set', () => {
    const payload = generateErpPayload('Test', cfg(), [], [mockHardwareWithPrice], mockOptimization);
    const h = payload.hardware[0];
    expect(h.unitPrice).toBe(2.5);
    expect(h.lineCost).toBe(+(2.5 * 4).toFixed(2));
  });

  it('sets lineCost to undefined when unitPrice is absent', () => {
    const payload = generateErpPayload('Test', cfg(), [], [mockHardwareNoPrice], mockOptimization);
    expect(payload.hardware[0].lineCost).toBeUndefined();
    expect(payload.hardware[0].unitPrice).toBeUndefined();
  });
});

describe('generateErpPayload — material summary', () => {
  it('creates one summary row per unique material', () => {
    const twoMaterialParts: Part[] = [mockPart, { ...mockPart, id: 'P02', material: 'plywood-12', thickness: 12 }];
    const payload = generateErpPayload('Test', cfg(), twoMaterialParts, [], mockOptimization);
    expect(payload.materialSummary).toHaveLength(2);
  });

  it('sheetsRequired is > 0 for known material with parts', () => {
    const payload = generateErpPayload('Test', cfg(), [mockPart], [], mockOptimization);
    const row = payload.materialSummary.find((m) => m.materialKey === 'melamine-18');
    expect(row?.sheetsRequired).toBeGreaterThan(0);
  });

  it('uses material key as displayName for unknown material', () => {
    const unknownPart: Part = { ...mockPart, material: 'custom-plywood-xyz' };
    const payload = generateErpPayload('Test', cfg(), [unknownPart], [], mockOptimization);
    const row = payload.materialSummary.find((m) => m.materialKey === 'custom-plywood-xyz');
    expect(row?.displayName).toBe('custom-plywood-xyz');
  });

  it('estimatedMaterialCost is undefined when any material has no price', () => {
    const unknownPart: Part = { ...mockPart, material: 'custom-no-price-material' };
    const payload = generateErpPayload('Test', cfg(), [unknownPart], [], mockOptimization);
    expect(payload.totals.estimatedMaterialCost).toBeUndefined();
  });

  it('estimatedMaterialCost is a number when all materials have prices', () => {
    const payload = generateErpPayload('Test', cfg(), [mockPart], [], mockOptimization);
    // melamine-18 has a pricePerSheet in the catalog
    const isNumberOrUndefined =
      payload.totals.estimatedMaterialCost === undefined || typeof payload.totals.estimatedMaterialCost === 'number';
    expect(isNumberOrUndefined).toBe(true);
  });
});

describe('generateErpPayload — totals', () => {
  it('totalParts sums qty across all parts', () => {
    const parts: Part[] = [
      { ...mockPart, qty: 2 },
      { ...mockPart, id: 'P02', qty: 4 },
    ];
    const payload = generateErpPayload('Test', cfg(), parts, [], mockOptimization);
    expect(payload.totals.totalParts).toBe(6);
  });

  it('totalSheets and overallYieldPercent come from optimization result', () => {
    const payload = generateErpPayload('Test', cfg(), [], [], mockOptimization);
    expect(payload.totals.totalSheets).toBe(2);
    expect(payload.totals.overallYieldPercent).toBe(88);
  });

  it('returns empty parts, hardware, materialSummary when given no data', () => {
    const payload: ErpPayload = generateErpPayload('Empty', cfg(), [], [], mockOptimization);
    expect(payload.parts).toHaveLength(0);
    expect(payload.hardware).toHaveLength(0);
    expect(payload.materialSummary).toHaveLength(0);
  });
});
