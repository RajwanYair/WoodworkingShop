#!/usr/bin/env node
/**
 * lint-summary.js — Run ESLint with JSON output and produce a structured
 * Markdown summary in $TEMP/WoodworkingShop/lint-summary.md.
 *
 * Usage:
 *   npm run lint:summary            run lint and write Markdown summary
 *
 * Output written to:
 *   $TEMP/WoodworkingShop/lint-summary.md    human-readable Markdown
 *   $TEMP/WoodworkingShop/lint-results.json  raw ESLint JSON output
 *
 * Exit codes:
 *   0 — lint passed (0 errors)
 *   1 — lint failed (errors or warnings present)
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const tmpDir = join(os.tmpdir(), 'WoodworkingShop');
const jsonOut = join(tmpDir, 'lint-results.json');
const mdOut = join(tmpDir, 'lint-summary.md');
const eslintCache = join(tmpDir, '.eslintcache-summary');

mkdirSync(tmpDir, { recursive: true });

// ─── 1. Run ESLint with JSON formatter ───────────────────────────────────────

let eslintExitCode = 0;
try {
  execSync(`npx eslint --cache --cache-location "${eslintCache}" --format json --output-file "${jsonOut}" .`, {
    cwd: root,
    stdio: 'pipe',
  });
} catch (err) {
  eslintExitCode = err.status ?? 1;
  // ESLint exits 1 when warnings/errors found — we still want the JSON output
}

// ─── 2. Parse ESLint JSON ─────────────────────────────────────────────────────

/** @type {Array<{filePath: string; messages: Array<{ruleId: string|null; severity: number; message: string; line: number; column: number}>; errorCount: number; warningCount: number}>} */
let lintResults;
try {
  lintResults = JSON.parse(readFileSync(jsonOut, 'utf-8'));
} catch {
  console.error(`lint-summary: could not read ESLint JSON output at ${jsonOut}`);
  process.exit(eslintExitCode || 1);
}

// ─── 3. Aggregate stats ───────────────────────────────────────────────────────

let totalErrors = 0;
let totalWarnings = 0;
let filesWithIssues = 0;
const generatedAt = new Date().toISOString();

/** @type {Map<string, number>} rule → occurrence count */
const ruleCounts = new Map();

/** @type {{ file: string; line: number; col: number; severity: string; ruleId: string; message: string }[]} */
const issues = [];

for (const result of lintResults) {
  totalErrors += result.errorCount;
  totalWarnings += result.warningCount;
  if (result.errorCount + result.warningCount > 0) {
    filesWithIssues++;
  }

  for (const msg of result.messages) {
    const ruleId = msg.ruleId ?? '(no rule)';
    ruleCounts.set(ruleId, (ruleCounts.get(ruleId) ?? 0) + 1);
    issues.push({
      file: relative(root, result.filePath).replaceAll('\\', '/'),
      line: msg.line,
      col: msg.column,
      severity: msg.severity === 2 ? 'error' : 'warning',
      ruleId,
      message: msg.message,
    });
  }
}

const totalIssues = totalErrors + totalWarnings;
const status = totalErrors === 0 ? '✅ PASS' : '❌ FAIL';
const filesChecked = lintResults.length;

// ─── 4. Build Markdown report ─────────────────────────────────────────────────

const lines = [
  `# Lint Summary — ${status}`,
  '',
  `> Generated: ${generatedAt}`,
  '',
  '## Overview',
  '',
  `| Metric           | Value               |`,
  `|------------------|---------------------|`,
  `| Status           | ${status}            |`,
  `| Files checked    | ${filesChecked}      |`,
  `| Files with issues| ${filesWithIssues}   |`,
  `| ❌ Errors         | ${totalErrors}       |`,
  `| ⚠️ Warnings       | ${totalWarnings}     |`,
  `| Total issues     | ${totalIssues}       |`,
  '',
];

// Top rules by occurrence
if (ruleCounts.size > 0) {
  const topRules = [...ruleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  lines.push('## Top Issues by Rule', '');
  lines.push('| Rule | Count |');
  lines.push('|------|-------|');
  for (const [rule, count] of topRules) {
    lines.push(`| \`${rule}\` | ${count} |`);
  }
  lines.push('');
}

// Per-file breakdown (files with issues only)
if (filesWithIssues > 0) {
  lines.push('## Files with Issues', '');
  for (const result of lintResults) {
    if (result.errorCount + result.warningCount === 0) continue;
    const relPath = relative(root, result.filePath).replaceAll('\\', '/');
    lines.push(`### \`${relPath}\` (${result.errorCount}E / ${result.warningCount}W)`);
    lines.push('');
    lines.push('| Line | Severity | Rule | Message |');
    lines.push('|------|----------|------|---------|');
    for (const msg of result.messages.slice(0, 20)) {
      const sev = msg.severity === 2 ? '❌ error' : '⚠️ warn';
      const rule = msg.ruleId ?? '—';
      const text = msg.message.replace(/\|/g, '\\|').slice(0, 80);
      lines.push(`| ${msg.line}:${msg.column} | ${sev} | \`${rule}\` | ${text} |`);
    }
    if (result.messages.length > 20) {
      lines.push(`| … | | | _${result.messages.length - 20} more issues_ |`);
    }
    lines.push('');
  }
}

if (totalIssues === 0) {
  lines.push(`No issues found across ${filesChecked} files. 🎉`, '');
}

const markdown = lines.join('\n');

// ─── 5. Write outputs ─────────────────────────────────────────────────────────

writeFileSync(mdOut, markdown, 'utf-8');
console.log(`\nLint summary written → ${mdOut}`);
console.log(`  ${totalErrors} errors, ${totalWarnings} warnings across ${filesChecked} files`);

process.exit(eslintExitCode);
