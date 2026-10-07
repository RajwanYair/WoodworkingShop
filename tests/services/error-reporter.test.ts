import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocalErrorReports, sendErrorReport } from '../../src/services/error-reporter';

describe('local error diagnostics', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    for (let index = 0; index < 25; index += 1) {
      sendErrorReport(new Error(`reset-${index}`));
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retains only sanitized recent errors in memory without network requests', () => {
    sendErrorReport(new Error('failure at C:\\Users\\ryair\\private\\cabinet.json contact me@example.com'));
    const reports = getLocalErrorReports();
    const latest = reports.at(-1);

    expect(reports).toHaveLength(20);
    expect(latest?.message).not.toContain('ryair');
    expect(latest?.message).not.toContain('me@example.com');
    expect(latest?.stack).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
    expect(latest).toMatchObject({ name: 'Error' });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('returns copies so consumers cannot mutate retained reports', () => {
    const reports = getLocalErrorReports();
    reports[0]!.message = 'changed';

    expect(getLocalErrorReports()[0]?.message).not.toBe('changed');
  });
});
