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

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const tmpDir = join(os.tmpdir(), 'WoodworkingShop');
const jsonOut = join(tmpDir, 'test-results.json');
const mdOut = join(tmpDir, 'test-summary.md');

mkdirSync(tmpDir, { recursive: true });

// ─── 1. Run Vitest with JSON reporter ────────────────────────────────────────

let vitestExitCode = 0;
try {
  execSync(`npx vitest run --reporter=json --outputFile="${jsonOut}"`, { stdio: 'inherit' });
} catch (err) {
  vitestExitCode = err.status ?? 1;
}

// ─── 2. Parse JSON results ────────────────────────────────────────────────────

/** @type {import('vitest').File[]} */
let results;
try {
  results = JSON.parse(readFileSync(jsonOut, 'utf-8'));
} catch {
  console.error(`vitest-reporter: could not read JSON output at ${jsonOut}`);
  process.exit(vitestExitCode || 1);
}

// ─── 3. Aggregate stats ───────────────────────────────────────────────────────

const files = Array.isArray(results?.testResults) ? results.testResults : [];

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;
let totalDurationMs = 0;

/** @type {{ file: string; name: string; error: string }[]} */
const failures = [];

for (const file of files) {
  const filePassed = file.status !== 'failed';
  totalDurationMs += file.perfStats?.end - file.perfStats?.start || 0;

  for (const suite of file.testResults ?? []) {
    totalTests++;
    if (suite.status === 'passed') {
      totalPassed++;
    } else if (suite.status === 'failed') {
      totalFailed++;
      failures.push({
        file: file.testFilePath?.replace(process.cwd(), '.') ?? file.testFilePath ?? '?',
        name: suite.fullName ?? suite.ancestorTitles?.join(' > ') + ' > ' + suite.title ?? 'unknown',
        error: suite.failureMessages?.join('\n') ?? '',
      });
    } else {
      totalSkipped++;
    }
    void filePassed;
  }
}

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
