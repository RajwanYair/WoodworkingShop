import { describe, it, expect } from 'vitest';
import {
  EXPORT_FORMATS,
  getFormatsByCategory,
  getAvailableFormats,
  getExportFormat,
  describeFormat,
} from '../../src/engine/export-format';

describe('EXPORT_FORMATS registry', () => {
  it('contains 11 formats', () => {
    expect(Object.keys(EXPORT_FORMATS)).toHaveLength(11);
  });

  it('all formats have bilingual names', () => {
    for (const f of Object.values(EXPORT_FORMATS)) {
      expect(f.name.en.length).toBeGreaterThan(0);
      expect(f.name.he.length).toBeGreaterThan(0);
    }
  });

  it('all formats have a non-empty file extension', () => {
    for (const f of Object.values(EXPORT_FORMATS)) {
      expect(f.fileExtension.startsWith('.')).toBe(true);
    }
  });
});

describe('getFormatsByCategory', () => {
  it('returns bom formats', () => {
    const bom = getFormatsByCategory('bom');
    expect(bom.length).toBeGreaterThanOrEqual(3);
    expect(bom.every((f) => f.category === 'bom')).toBe(true);
  });

  it('returns cnc formats', () => {
    const cnc = getFormatsByCategory('cnc');
    expect(cnc.length).toBeGreaterThanOrEqual(1);
  });
});

describe('getAvailableFormats', () => {
  it('excludes cut-layout formats when hasCutLayout=false', () => {
    const formats = getAvailableFormats(false, false);
    expect(formats.every((f) => !f.requiresCutLayout)).toBe(true);
  });

  it('includes cut-layout formats when hasCutLayout=true', () => {
    const formats = getAvailableFormats(true, false);
    expect(formats.some((f) => f.requiresCutLayout)).toBe(true);
  });

  it('excludes gcode when no CNC profile', () => {
    const formats = getAvailableFormats(true, false);
    expect(formats.find((f) => f.id === 'gcode')).toBeUndefined();
  });

  it('includes gcode when CNC profile is present', () => {
    const formats = getAvailableFormats(true, true);
    expect(formats.find((f) => f.id === 'gcode')).toBeDefined();
  });
});

describe('getExportFormat', () => {
  it('returns the correct format by id', () => {
    const f = getExportFormat('pdf-bom');
    expect(f.fileExtension).toBe('.pdf');
    expect(f.category).toBe('bom');
  });
});

describe('describeFormat', () => {
  it('includes name and extension in description', () => {
    const desc = describeFormat('csv-bom');
    expect(desc).toContain('CSV');
    expect(desc).toContain('.csv');
  });
});
