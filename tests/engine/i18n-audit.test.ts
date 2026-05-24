import { describe, it, expect } from 'vitest';
import { flattenLocale, auditLocale, auditAllLocales, formatAuditReport } from '../../src/engine/i18n-audit';
import type { FlatLocale, LocaleTree } from '../../src/engine/i18n-audit';

const en: FlatLocale = {
  'config.width': 'Width',
  'config.height': 'Height',
  'config.depth': 'Depth',
  'action.save': 'Save',
};

const he: FlatLocale = {
  'config.width': 'רוחב',
  'config.height': 'גובה',
  'config.depth': 'עומק',
  'action.save': 'שמור',
};

const heWithMissing: FlatLocale = {
  'config.width': 'רוחב',
  'config.height': 'גובה',
  // config.depth missing
  'action.save': 'שמור',
};

const heWithExtra: FlatLocale = {
  ...he,
  'extra.unknown': 'ערך',
};

const heWithEmpty: FlatLocale = {
  ...he,
  'config.depth': '   ',
};

describe('flattenLocale', () => {
  it('flattens nested objects to dot-notation', () => {
    const tree: LocaleTree = { config: { width: 'Width', height: 'Height' } };
    const flat = flattenLocale(tree);
    expect(flat['config.width']).toBe('Width');
    expect(flat['config.height']).toBe('Height');
  });

  it('handles single-level object', () => {
    const flat = flattenLocale({ key: 'Value' } as LocaleTree);
    expect(flat['key']).toBe('Value');
  });

  it('handles deeply nested objects', () => {
    const tree: LocaleTree = { a: { b: { c: 'deep' } } };
    expect(flattenLocale(tree)['a.b.c']).toBe('deep');
  });
});

describe('auditLocale', () => {
  it('returns clean for matching locales', () => {
    const result = auditLocale('he', he, en);
    expect(result.clean).toBe(true);
    expect(result.missingKeys).toHaveLength(0);
    expect(result.extraKeys).toHaveLength(0);
    expect(result.emptyKeys).toHaveLength(0);
  });

  it('detects missing keys', () => {
    const result = auditLocale('he', heWithMissing, en);
    expect(result.missingKeys).toContain('config.depth');
    expect(result.clean).toBe(false);
  });

  it('detects extra keys', () => {
    const result = auditLocale('he', heWithExtra, en);
    expect(result.extraKeys).toContain('extra.unknown');
    expect(result.clean).toBe(false);
  });

  it('detects empty values', () => {
    const result = auditLocale('he', heWithEmpty, en);
    expect(result.emptyKeys).toContain('config.depth');
    expect(result.clean).toBe(false);
  });
});

describe('auditAllLocales', () => {
  it('returns allClean when all locales are clean', () => {
    const report = auditAllLocales('en', { en, he });
    expect(report.allClean).toBe(true);
    expect(report.results).toHaveLength(1);
  });

  it('returns allClean=false when a locale has issues', () => {
    const report = auditAllLocales('en', { en, he: heWithMissing });
    expect(report.allClean).toBe(false);
  });

  it('excludes reference locale from results', () => {
    const report = auditAllLocales('en', { en, he });
    expect(report.results.map((r) => r.locale)).not.toContain('en');
  });

  it('handles single-locale (only reference)', () => {
    const report = auditAllLocales('en', { en });
    expect(report.results).toHaveLength(0);
    expect(report.allClean).toBe(true);
  });
});

describe('formatAuditReport', () => {
  it('includes locale tags in output', () => {
    const report = auditAllLocales('en', { en, he: heWithMissing });
    const text = formatAuditReport(report);
    expect(text).toContain('[he]');
  });

  it('mentions missing key in output', () => {
    const report = auditAllLocales('en', { en, he: heWithMissing });
    const text = formatAuditReport(report);
    expect(text).toContain('config.depth');
  });

  it('marks clean report as clean', () => {
    const report = auditAllLocales('en', { en, he });
    const text = formatAuditReport(report);
    expect(text).toContain('clean');
  });
});
