import { summarizeVitestReport } from '../../scripts/vitest-reporter.js';

describe('summarizeVitestReport', () => {
  it('counts passed, failed, and skipped assertions from Vitest JSON output', () => {
    const summary = summarizeVitestReport({
      testResults: [
        {
          name: 'tests/example.test.ts',
          startTime: 100,
          endTime: 250,
          assertionResults: [
            { status: 'passed', title: 'passes' },
            { status: 'failed', title: 'fails', failureMessages: ['expected value'] },
            { status: 'todo', title: 'skips' },
          ],
        },
      ],
    });

    expect(summary).toMatchObject({
      totalTests: 3,
      totalPassed: 1,
      totalFailed: 1,
      totalSkipped: 1,
      totalDurationMs: 150,
      failures: [{ file: 'tests/example.test.ts', name: 'fails', error: 'expected value' }],
    });
  });

  it.each([
    { name: 'missing testResults', report: {} },
    { name: 'zero tests', report: { testResults: [] } },
    { name: 'missing assertionResults', report: { testResults: [{ name: 'tests/invalid.test.ts' }] } },
  ])('throws for invalid report: $name', ({ report }) => {
    expect(() => summarizeVitestReport(report)).toThrow();
  });
});
