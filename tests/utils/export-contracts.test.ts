import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutSheetToDxf } from '../../src/utils/dxf-export';
import { cutSheetToGcode } from '../../src/utils/gcode-export';
import { generateBomCsv } from '../../src/utils/bom-export';
import type { HardwareItem, Part } from '../../src/engine/types';
import { mockSheet } from '../helpers';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(THIS_DIR, '..', 'fixtures', 'export-contracts');

const mockPart: Part = {
  id: 'P01',
  name: { en: 'Side Panel', he: 'לוח צד' },
  qty: 2,
  material: 'melamine-18',
  thickness: 18,
  length: 2000,
  width: 580,
  edgeBanding: { en: 'Front edge', he: 'קצה קדמי' },
};

const mockHardware: HardwareItem = {
  id: 'hinge',
  name: { en: 'Hinge 35mm', he: 'ציר 35 מ"מ' },
  qty: 4,
  unit: { en: 'pcs', he: 'יח׳' },
};

const singleCabinet = [
  {
    name: 'Cabinet A',
    parts: [mockPart],
    hardware: [mockHardware],
  },
];

function normalizeDxf(value: string): string {
  return value
    .replace(/Version: .*/g, 'Version: <APP_VERSION>')
    .replace(/Generated: .*/g, 'Generated: <ISO_TIMESTAMP>');
}

function normalizeGcode(value: string): string {
  return value
    .replace(/; Version: .*/g, '; Version: <APP_VERSION>  Schema: gcode-v1')
    .replace(/; Generated: .*/g, '; Generated: <ISO_TIMESTAMP>');
}

function normalizeBom(value: string): string {
  return value
    .replace(/# Version: .*/g, '# Version: <APP_VERSION>  Schema: bom-csv-v1')
    .replace(/# Generated: .*/g, '# Generated: <ISO_TIMESTAMP>');
}

function assertGolden(name: string, actual: string): void {
  const fixturePath = join(FIXTURES_DIR, `${name}.golden.txt`);
  if (process.env.UPDATE_GOLDEN === '1') {
    mkdirSync(FIXTURES_DIR, { recursive: true });
    writeFileSync(fixturePath, actual, 'utf8');
    return;
  }
  const expected = readFileSync(fixturePath, 'utf8');
  expect(actual).toBe(expected);
}

describe('export golden contracts', () => {
  it.each([
    {
      name: 'dxf-sheet',
      actual: normalizeDxf(cutSheetToDxf(mockSheet)),
    },
    {
      name: 'gcode-sheet',
      actual: normalizeGcode(cutSheetToGcode(mockSheet, { emitToolChange: true })),
    },
    {
      name: 'bom-single-cabinet',
      actual: normalizeBom(generateBomCsv(singleCabinet, 'en', 'en')),
    },
  ])('matches golden file: $name', ({ name, actual }) => {
    assertGolden(name, actual);
  });
});
