#!/usr/bin/env node
/**
 * vitest-reporter.js — Run Vitest in JSON reporter mode and produce a
 * structured Markdown test summary in $TEMP/WoodworkingShop/test-summary.md.
 *
 * Usage:
 *   npm run test:summary            run all tests and write summary
 *   npm run test:summary -- --watch pipe is not supported in watch mode
 *
 * Output written to:
 *   $TEMP/WoodworkingShop/test-summary.md   human-readable Markdown
 *   $TEMP/WoodworkingShop/test-results.json raw Vitest JSON output
 *
 * Exit codes mirror Vitest (0 = all pass, 1 = failures present).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';

const tmpDir = join(os.tmpdir(), 'WoodworkingShop');
const jsonOut = join(tmpDir, 'test-results.json');
const mdOut = join(tmpDir, 'test-summary.md');

mkdirSync(tmpDir, { recursive: true });

/** @param {unknown} input */
export function summarizeVitestReport(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.testResults)) {
    throw new Error('Vitest JSON report is missing its testResults array');
  }

  const files = input.testResults;
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDurationMs = 0;
  /** @type {{ file: string; name: string; error: string }[]} */
  const failures = [];

  for (const file of files) {
    if (!Array.isArray(file.assertionResults)) {
      throw new Error('Vitest JSON report contains a file without assertionResults');
    }

    totalDurationMs += Math.max(0, (file.endTime ?? 0) - (file.startTime ?? 0));
    for (const assertion of file.assertionResults) {
      totalTests++;
      if (assertion.status === 'passed') {
        totalPassed++;
      } else if (assertion.status === 'failed') {
        totalFailed++;
        failures.push({
          file: file.name ?? '?',
          name: assertion.fullName ?? assertion.title ?? 'unknown',
          error: assertion.failureMessages?.join('\n') ?? '',
        });
      } else {
        totalSkipped++;
      }
    }
  }

  if (totalTests === 0) {
    throw new Error('Vitest JSON report contains zero tests');
  }

  return {
    files,
    totalTests,
    totalPassed,
    totalFailed,
    totalSkipped,
    totalDurationMs,
    failures,
  };
}

function run() {
  // ─── 1. Run the installed, project-resolved Vitest CLI ─────────────────────

  let vitestExitCode = 0;
  rmSync(jsonOut, { force: true });
  try {
    const require = createRequire(import.meta.url);
    const vitestEntry = require.resolve('vitest');
    const vitestCli = resolve(dirname(vitestEntry), 'vitest.mjs');
    if (!existsSync(vitestCli)) {
      throw new Error(`Installed Vitest CLI was not found beside ${vitestEntry}`);
    }
    execFileSync(process.execPath, [vitestCli, 'run', '--reporter=json', `--outputFile=${jsonOut}`], {
      stdio: 'inherit',
    });
  } catch (err) {
    if (err.status === undefined) {
      console.error(`vitest-reporter: ${err.message ?? 'could not start the project-local Vitest executable'}`);
      process.exit(1);
    }
    vitestExitCode = err.status ?? 1;
  }

  // ─── 2. Parse JSON results ───────────────────────────────────────────────────

  let report;
  try {
    report = JSON.parse(readFileSync(jsonOut, 'utf-8'));
  } catch {
    console.error(`vitest-reporter: could not read JSON output at ${jsonOut}`);
    process.exit(vitestExitCode || 1);
  }

  let summary;
  try {
    summary = summarizeVitestReport(report);
  } catch (err) {
    console.error(`vitest-reporter: ${err.message}`);
    process.exit(vitestExitCode || 1);
  }

  const { files, totalTests, totalPassed, totalFailed, totalSkipped, totalDurationMs, failures } = summary;

  const durationS = (totalDurationMs / 1000).toFixed(2);
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '—';
  const generatedAt = new Date().toISOString();
  const status = totalFailed === 0 ? '✅ PASS' : '❌ FAIL';

  // ─── 4. Build Markdown report ─────────────────────────────────────────────────

  const lines = [
    `# Test Summary — ${status}`,
    '',
    `> Generated: ${generatedAt}`,
    '',
    '## Overview',
    '',
    `| Metric       | Value            |`,
    `|--------------|------------------|`,
    `| Status       | ${status}         |`,
    `| Tests run    | ${totalTests}     |`,
    `| ✅ Passed     | ${totalPassed}    |`,
    `| ❌ Failed     | ${totalFailed}    |`,
    `| ⏭ Skipped    | ${totalSkipped}   |`,
    `| Pass rate    | ${passRate}%      |`,
    `| Duration     | ${durationS}s     |`,
    `| Test files   | ${files.length}   |`,
    '',
  ];

  if (failures.length > 0) {
    lines.push('## ❌ Failures', '');
    for (const f of failures) {
      lines.push(`### \`${f.file}\``);
      lines.push(`**Test:** ${f.name}`);
      if (f.error) {
        lines.push('');
        lines.push('```');
        lines.push(f.error.trim().slice(0, 800)); // cap error output
        lines.push('```');
      }
      lines.push('');
    }
  }

  if (totalFailed === 0) {
    lines.push(`All **${totalPassed}** tests passed. 🎉`, '');
  }

  const markdown = lines.join('\n');

  // ─── 5. Write outputs ─────────────────────────────────────────────────────────

  writeFileSync(mdOut, markdown, 'utf-8');
  console.log(`\nTest summary written → ${mdOut}`);
  console.log(`  ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped (${passRate}%)`);

  process.exit(vitestExitCode);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
