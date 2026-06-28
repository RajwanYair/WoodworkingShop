import { describe, expect, it } from 'vitest';
import {
  getExportSchemaVersion,
  DXF_SCHEMA_VERSION,
  GCODE_SCHEMA_VERSION,
  BOM_CSV_SCHEMA_VERSION,
  PDF_SCHEMA_VERSION,
  PROJECT_JSON_SCHEMA_VERSION,
} from '../../../src/engine/export-schema';

describe('getExportSchemaVersion', () => {
  it.each([
    { format: 'dxf' as const, expected: DXF_SCHEMA_VERSION },
    { format: 'gcode' as const, expected: GCODE_SCHEMA_VERSION },
    { format: 'bom-csv' as const, expected: BOM_CSV_SCHEMA_VERSION },
    { format: 'pdf' as const, expected: PDF_SCHEMA_VERSION },
    { format: 'project-json' as const, expected: PROJECT_JSON_SCHEMA_VERSION },
  ])('returns "$expected" for format "$format"', ({ format, expected }) => {
    expect(getExportSchemaVersion(format)).toBe(expected);
  });

  it('returned values are non-empty strings', () => {
    const formats = ['dxf', 'gcode', 'bom-csv', 'pdf', 'project-json'] as const;
    for (const format of formats) {
      const version = getExportSchemaVersion(format);
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    }
  });

  it('schema versions follow the <format>-v<major> naming convention', () => {
    expect(DXF_SCHEMA_VERSION).toMatch(/^dxf-/);
    expect(GCODE_SCHEMA_VERSION).toMatch(/^gcode-/);
    expect(BOM_CSV_SCHEMA_VERSION).toMatch(/^bom-csv-/);
    expect(PDF_SCHEMA_VERSION).toMatch(/^pdf-/);
    expect(PROJECT_JSON_SCHEMA_VERSION).toMatch(/^project-json-/);
  });
});
