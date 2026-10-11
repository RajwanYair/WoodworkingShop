import { describe, expect, it } from 'vitest';
import { makeSavedProject } from '../helpers';
import { validateProjectPayload } from '../../src/utils/project-storage';

describe('validateProjectPayload', () => {
  it('returns no diagnostics for a canonical project', () => {
    const project = makeSavedProject({ generatedAt: '2026-01-01T00:00:00.000Z' });
    expect(validateProjectPayload(project, { recoveryAction: 'Choose another project file' })).toEqual({
      valid: true,
      diagnostics: [],
      truncated: false,
    });
  });

  it('reports the JSON path, expected requirement, actual value, and localized recovery action', () => {
    const project = makeSavedProject() as unknown as Record<string, unknown>;
    project['schemaVersion'] = '2.0';
    delete project['name'];

    const result = validateProjectPayload(project, { recoveryAction: 'בחרו קובץ פרויקט אחר' });
    const missingName = result.diagnostics.find((diagnostic) => diagnostic.expected === 'required property "name"');

    expect(result.valid).toBe(false);
    expect(missingName).toMatchObject({
      path: '$.name',
      expected: 'required property "name"',
      actual: 'missing',
      recoveryAction: 'בחרו קובץ פרויקט אחר',
    });
    expect(result.diagnostics.find((diagnostic) => diagnostic.path === '$.schemaVersion')?.actual).toBe('"2.0"');
  });

  it('caps diagnostics and escapes markup in untrusted actual values', () => {
    const project = { ...makeSavedProject(), schemaVersion: '2.0', unexpected: '<script>alert(1)</script>' };
    const result = validateProjectPayload(project, { recoveryAction: 'Review the project file', maxDiagnostics: 1 });
    const untrustedValueResult = validateProjectPayload(
      { ...makeSavedProject({ generatedAt: '2026-01-01T00:00:00.000Z' }), schemaVersion: '<script>alert(1)</script>' },
      { recoveryAction: 'Review the project file' },
    );
    const schemaVersionDiagnostic = untrustedValueResult.diagnostics.find(
      (diagnostic) => diagnostic.path === '$.schemaVersion',
    );

    expect(result.diagnostics).toHaveLength(1);
    expect(result.truncated).toBe(true);
    expect(JSON.stringify(result.diagnostics)).not.toContain('<script>');
    expect(schemaVersionDiagnostic?.actual).toContain('\\u003cscript\\u003e');
    expect(schemaVersionDiagnostic?.expected).not.toContain('<');
  });

  it.each([-1, 0, 1, 100, Number.POSITIVE_INFINITY])(
    'keeps requested diagnostic cap %s within the global safe maximum',
    (maxDiagnostics) => {
      const result = validateProjectPayload(
        { unexpected: true },
        { recoveryAction: 'Fix the project file', maxDiagnostics },
      );

      expect(result.diagnostics.length).toBeLessThanOrEqual(20);
      if (maxDiagnostics <= 0) expect(result.diagnostics).toHaveLength(0);
    },
  );
});
