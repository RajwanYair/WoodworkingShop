interface VitestAssertionResult {
  status: string;
  title?: string;
  fullName?: string;
  failureMessages?: string[];
}

interface VitestTestFile {
  name?: string;
  startTime?: number;
  endTime?: number;
  assertionResults: VitestAssertionResult[];
}

interface VitestSummary {
  files: VitestTestFile[];
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDurationMs: number;
  failures: { file: string; name: string; error: string }[];
}

export function summarizeVitestReport(input: unknown): VitestSummary;
