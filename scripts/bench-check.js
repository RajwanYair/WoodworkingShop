#!/usr/bin/env node
/**
 * bench-check.js — Run Vitest benchmarks and verify all stay within the
 * thresholds in config/bench-budget.json.
 *
 * Usage:
 *   npm run bench:check    run benchmarks then check against budget
 *   npm run bench:update   run benchmarks then rewrite budget to 5× current mean
 *
 * Exit codes:
 *   0 — all benchmarks within budget (or --update succeeded)
 *   1 — one or more benchmarks exceeded their maxMeanMs threshold
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = join(__dirname, '..');
const tmpDir = join(os.tmpdir(), 'WoodworkingShop');
const results = join(tmpDir, 'bench-results.json');
const budgetSrc = join(root, 'config', 'bench-budget.json');

const isUpdate = process.argv.includes('--update');

// ─── 1. Run benchmarks ───────────────────────────────────────────────────────
console.log('⏱  Running engine benchmarks…\n');
mkdirSync(tmpDir, { recursive: true });

try {
  execSync('npx vitest bench --config vitest.bench.config.ts', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CI: '1' }, // CI=1 disables watch in Vitest
  });
} catch {
  // vitest exits non-zero when interrupted — tolerate; we'll check the JSON below
}

// ─── 2. Load JSON output ─────────────────────────────────────────────────────
if (!existsSync(results)) {
  console.error(`\nNo results file at ${results} — did vitest bench run successfully?`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(results, 'utf-8'));
const budget = existsSync(budgetSrc) ? JSON.parse(readFileSync(budgetSrc, 'utf-8')) : {};

// Flatten all benchmark entries across files and groups
const benches = [];
for (const file of raw.files ?? []) {
  for (const group of file.groups ?? []) {
    const groupLabel = (group.fullName ?? '').replace(/^.*> /, '');
    for (const b of group.benchmarks ?? []) {
      if (!b.name) continue;
      benches.push({
        group: groupLabel,
        name: b.name,
        meanMs: typeof b.mean === 'number' ? b.mean : Infinity,
        hz: typeof b.hz === 'number' ? b.hz : 0,
        p99Ms: typeof b.p99 === 'number' ? b.p99 : Infinity,
      });
    }
  }
}

// Sort slowest mean first — highlights hot-paths at the top
benches.sort((a, b) => b.meanMs - a.meanMs);

// ─── 3. Update mode — rewrite budget to 5× measured mean ────────────────────
if (isUpdate) {
  const MULTIPLIER = 5;
  const now = new Date().toISOString().slice(0, 10);
  const newBudget = {
    _comment: `Per-benchmark max-mean-ms gate. Thresholds = ${MULTIPLIER}× measured baseline. Run 'npm run bench:update' to recalibrate after intentional perf changes.`,
    _updated: now,
    _howToUse: [
      'npm run bench         — run benchmarks',
      'npm run bench:check   — run benchmarks then verify thresholds',
      'npm run bench:update  — run benchmarks then rewrite this file to 5× current mean',
    ],
  };
  for (const b of benches) {
    newBudget[b.name] = {
      maxMeanMs: parseFloat((b.meanMs * MULTIPLIER).toFixed(6)),
      baseline: parseFloat(b.meanMs.toFixed(6)),
    };
  }
  writeFileSync(budgetSrc, JSON.stringify(newBudget, null, 2) + '\n', 'utf-8');
  console.log(
    `\n✅  Budget updated → config/bench-budget.json (${benches.length} entries, threshold = ${MULTIPLIER}× mean)\n`,
  );
  process.exit(0);
}

// ─── 4. Check mode — print table, fail if any exceed threshold ───────────────
const COL = { g: 22, n: 48, mean: 10, hz: 13, p99: 9, status: 22 };
const total = Object.values(COL).reduce((s, n) => s + n, 0) + Object.keys(COL).length * 2;
const hr = '─'.repeat(total);
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log('\n' + hr);
console.log(
  pad('Group', COL.g) +
    '  ' +
    pad('Benchmark', COL.n) +
    '  ' +
    padL('Mean ms', COL.mean) +
    '  ' +
    padL('Ops/sec', COL.hz) +
    '  ' +
    padL('p99 ms', COL.p99) +
    '  ' +
    pad('Status', COL.status),
);
console.log(hr);

let failures = 0;

for (const b of benches) {
  const threshold = budget[b.name];
  const maxMean = typeof threshold?.maxMeanMs === 'number' ? threshold.maxMeanMs : null;

  let status;
  if (maxMean === null) {
    status = '  (no budget set)';
  } else if (b.meanMs > maxMean) {
    status = `✗ FAIL  >${maxMean} ms`;
    failures++;
  } else {
    const pct = Math.round((b.meanMs / maxMean) * 100);
    status = `✓  ${pct}% of budget`;
  }

  console.log(
    pad(b.group.slice(0, COL.g), COL.g) +
      '  ' +
      pad(b.name.slice(0, COL.n), COL.n) +
      '  ' +
      padL(b.meanMs.toFixed(5), COL.mean) +
      '  ' +
      padL(Math.round(b.hz).toLocaleString(), COL.hz) +
      '  ' +
      padL(b.p99Ms.toFixed(5), COL.p99) +
      '  ' +
      status,
  );
}

console.log(hr);

if (failures > 0) {
  console.error(
    `\n✗  ${failures} benchmark(s) exceeded budget.` +
      `\n   Optimise the slow path, or run 'npm run bench:update' to recalibrate thresholds.\n`,
  );
  process.exit(1);
} else {
  console.log(`\n✅  All ${benches.length} benchmarks within budget.\n`);
}
