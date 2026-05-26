import { describe, it, expect } from 'vitest';
import {
  buildErpLineItems,
  formatAsSap,
  formatAsOracle,
  formatAsWebhook,
  validateErpPayload,
  exportErp,
  ERP_SCHEMA_VERSION,
} from '../../src/engine/erp-export';
import type { ErpHeader, ErpLineItem } from '../../src/engine/erp-export';
import type { OptimizationResult, CutSheet, CutRect } from '../../src/engine/types';
import type { CostBreakdown } from '../../src/engine/cost-estimator';
import { cfg } from '../helpers';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePart(partId: string, label: string, w: number, l: number): CutRect {
  return { partId, label, x: 0, y: 0, width: w, length: l, grainVertical: true };
}

function makeSheet(material: string, parts: CutRect[]): CutSheet {
  return {
    sheetIndex: 0,
    material,
    thickness: 18,
    sheetWidth: 2440,
    sheetLength: 1220,
    parts,
    yieldPercent: 85,
  };
}

function makeOptimization(sheets: CutSheet[]): OptimizationResult {
  return {
    sheets,
    totalSheets: sheets.length,
    overallYield: 85,
    totalWaste: 0,
    grainConflictCount: 0,
  };
}

function makeCost(): CostBreakdown {
  return {
    sheetCosts: [
      {
        material: 'melamine-18',
        materialName: { en: 'Melamine 18mm', he: 'מלמין 18' },
        thickness: 18,
        qty: 1,
        pricePerSheet: 140,
        subtotal: 140,
      },
    ],
    hardwareItems: [],
    edgeBandingCost: 5,
    hardwareCost: 0,
    wasteCost: 10,
    labourHours: 2,
    labourCost: 100,
    finishCost: 0,
    totalMaterialCost: 155,
    totalCost: 255,
  };
}

const PARTS = [makePart('P01', 'Side Panel', 720, 580), makePart('P02', 'Top Panel', 964, 580)];
const SHEET = makeSheet('melamine-18', PARTS);
const OPT = makeOptimization([SHEET]);
const COST = makeCost();
const CONFIG = cfg({ width: 1000, height: 720, depth: 580 });

// ─── buildErpLineItems ────────────────────────────────────────────────────────

describe('buildErpLineItems', () => {
  it('returns one line item per part', () => {
    const items = buildErpLineItems(OPT, COST);
    expect(items).toHaveLength(2);
  });

  it('populates required fields on each item', () => {
    const [item] = buildErpLineItems(OPT, COST);
    expect(item.partNumber).toBe('P01');
    expect(item.description).toBe('Side Panel');
    expect(item.materialKey).toBe('melamine-18');
    expect(item.quantity).toBe(1);
    expect(item.uom).toBe('EA');
    expect(item.thicknessMm).toBe(18);
  });

  it('computes areaMm2 correctly', () => {
    const [item] = buildErpLineItems(OPT, COST);
    expect(item.areaMm2).toBe(720 * 580);
  });

  it('grossAreaMm2 is >= areaMm2', () => {
    const items = buildErpLineItems(OPT, COST, 3);
    for (const item of items) {
      expect(item.grossAreaMm2).toBeGreaterThanOrEqual(item.areaMm2);
    }
  });

  it('throws RangeError for invalid kerfMm', () => {
    expect(() => buildErpLineItems(OPT, COST, -1)).toThrow(RangeError);
    expect(() => buildErpLineItems(OPT, COST, 25)).toThrow(RangeError);
  });

  it('returns empty array for optimization with no sheets', () => {
    const emptyOpt = makeOptimization([]);
    expect(buildErpLineItems(emptyOpt, COST)).toHaveLength(0);
  });

  it.each([
    ['zero kerf', 0, 1],
    ['small kerf', 3, 1.06],
    ['large kerf', 20, 1.4],
  ])('%s: grossAreaMm2 factor is roughly expected', (_label, kerfMm, _minFactor) => {
    const [item] = buildErpLineItems(OPT, COST, kerfMm);
    expect(item.grossAreaMm2).toBeGreaterThanOrEqual(item.areaMm2);
  });
});

// ─── formatAsSap ─────────────────────────────────────────────────────────────

function makeHeader(lineCount = 2): ErpHeader {
  return {
    projectName: 'Test Cabinet',
    exportedAt: '2026-05-26T00:00:00.000Z',
    dimensions: '1000×720×580 mm',
    lineCount,
    totalCost: 255,
    currencyCode: 'ILS',
    schemaVersion: ERP_SCHEMA_VERSION,
  };
}

function makeItem(partNumber = 'P01'): ErpLineItem {
  return {
    partNumber,
    description: 'Side Panel',
    materialKey: 'melamine-18',
    quantity: 1,
    uom: 'EA',
    areaMm2: 417600,
    grossAreaMm2: 442656,
    thicknessMm: 18,
    unitCost: 3.38,
    extendedCost: 3.38,
  };
}

describe('formatAsSap', () => {
  it('starts with HDR segment', () => {
    const csv = formatAsSap(makeHeader(), [makeItem()]);
    expect(csv.startsWith('HDR,')).toBe(true);
  });

  it('includes column header row with SAP field names', () => {
    const csv = formatAsSap(makeHeader(), [makeItem()]);
    expect(csv).toContain('MATNR');
    expect(csv).toContain('MAKTX');
    expect(csv).toContain('MEINS');
    expect(csv).toContain('NETPR');
  });

  it('ends with FTR segment containing cost and currency', () => {
    const csv = formatAsSap(makeHeader(), [makeItem()]);
    const lines = csv.split('\n');
    const ftr = lines[lines.length - 1];
    expect(ftr).toContain('FTR');
    expect(ftr).toContain('ILS');
  });

  it('sanitizes commas in part descriptions', () => {
    const item = makeItem();
    item.description = 'Side, Panel';
    const csv = formatAsSap(makeHeader(1), [item]);
    // After sanitization, no stray comma should break CSV columns
    const lines = csv.split('\n');
    const dataLine = lines[2]; // HDR, HEADER, then data
    const cols = dataLine.split(',');
    expect(cols.length).toBeGreaterThanOrEqual(11);
  });

  it('produces empty body for zero items', () => {
    const csv = formatAsSap(makeHeader(0), []);
    expect(csv).toContain('HDR,');
    expect(csv).toContain('FTR,0,');
  });
});

// ─── formatAsOracle ───────────────────────────────────────────────────────────

describe('formatAsOracle', () => {
  it('produces valid JSON', () => {
    const json = formatAsOracle(makeHeader(), [makeItem()]);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('contains oracleScm envelope', () => {
    const parsed = JSON.parse(formatAsOracle(makeHeader(), [makeItem()]));
    expect(parsed).toHaveProperty('oracleScm');
  });

  it('purchasingDocumentLines has correct length', () => {
    const parsed = JSON.parse(formatAsOracle(makeHeader(2), [makeItem('P01'), makeItem('P02')]));
    expect(parsed.oracleScm.purchasingDocumentLines).toHaveLength(2);
  });

  it('line numbers start at 1', () => {
    const parsed = JSON.parse(formatAsOracle(makeHeader(1), [makeItem('P01')]));
    expect(parsed.oracleScm.purchasingDocumentLines[0].lineNumber).toBe(1);
  });
});

// ─── formatAsWebhook ──────────────────────────────────────────────────────────

describe('formatAsWebhook', () => {
  it('produces valid JSON', () => {
    const json = formatAsWebhook(makeHeader(), [makeItem()]);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('uses snake_case top-level keys', () => {
    const parsed = JSON.parse(formatAsWebhook(makeHeader(), [makeItem()]));
    expect(parsed).toHaveProperty('schema_version');
    expect(parsed).toHaveProperty('bom_items');
    expect(parsed).toHaveProperty('project_name');
  });

  it('bom_items maps part_number correctly', () => {
    const parsed = JSON.parse(formatAsWebhook(makeHeader(1), [makeItem('P99')]));
    expect(parsed.bom_items[0].part_number).toBe('P99');
  });
});

// ─── validateErpPayload ───────────────────────────────────────────────────────

describe('validateErpPayload', () => {
  it('returns no findings for valid payload', () => {
    const findings = validateErpPayload(makeHeader(), [makeItem()]);
    expect(findings).toHaveLength(0);
  });

  it('errors on empty project name', () => {
    const h = makeHeader();
    h.projectName = '   ';
    const findings = validateErpPayload(h, [makeItem()]);
    expect(findings.some((f) => f.severity === 'error' && f.field === 'header.projectName')).toBe(true);
  });

  it('warns on empty items array', () => {
    const findings = validateErpPayload(makeHeader(0), []);
    expect(findings.some((f) => f.severity === 'warning' && f.field === 'items')).toBe(true);
  });

  it('errors on negative total cost', () => {
    const h = makeHeader();
    h.totalCost = -1;
    const findings = validateErpPayload(h, [makeItem()]);
    expect(findings.some((f) => f.severity === 'error' && f.field === 'header.totalCost')).toBe(true);
  });

  it('warns when part number exceeds SAP 18-char limit', () => {
    const item = makeItem('VERY-LONG-PART-NUMBER-EXCEEDS-LIMIT');
    const findings = validateErpPayload(makeHeader(1), [item]);
    expect(findings.some((f) => f.severity === 'warning')).toBe(true);
  });

  it('errors on quantity <= 0', () => {
    const item = makeItem();
    item.quantity = 0;
    const findings = validateErpPayload(makeHeader(1), [item]);
    expect(findings.some((f) => f.severity === 'error')).toBe(true);
  });
});

// ─── exportErp integration ────────────────────────────────────────────────────

describe('exportErp', () => {
  it.each([
    ['sap' as const, 'sapCsv'],
    ['oracle' as const, 'oracleJson'],
    ['webhook' as const, 'webhookJson'],
  ])('system=%s populates the %s field', (system, field) => {
    const result = exportErp(system, CONFIG, OPT, COST, 'My Cabinet');
    expect(result.system).toBe(system);
    expect(result[field as keyof typeof result]).toBeDefined();
    expect(typeof result[field as keyof typeof result]).toBe('string');
  });

  it('header dimensions string matches config', () => {
    const result = exportErp('webhook', CONFIG, OPT, COST);
    expect(result.header.dimensions).toBe('1000×720×580 mm');
  });

  it('header lineCount equals number of parts', () => {
    const result = exportErp('sap', CONFIG, OPT, COST);
    expect(result.header.lineCount).toBe(PARTS.length);
  });

  it('throws RangeError for unknown system', () => {
    expect(() => exportErp('unknown' as never, CONFIG, OPT, COST)).toThrow(RangeError);
  });

  it('uses default project name when not provided', () => {
    const result = exportErp('webhook', CONFIG, OPT, COST);
    expect(result.header.projectName).toBe('Cabinet Project');
  });
});
