#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src');
const reportPath = path.join(os.tmpdir(), 'WoodworkingShop', 'coverage', 'coverage-summary.json');
const componentReportPath = path.join(os.tmpdir(), 'WoodworkingShop', 'coverage-components', 'coverage-summary.json');
const baselinePath = path.join(repoRoot, 'config', 'coverage-baseline.json');
const areas = ['engine', 'utils', 'store', 'hooks', 'components'];
const metrics = ['statements', 'branches', 'functions', 'lines'];
const isUpdate = process.argv.includes('--update');

function loadJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found at ${filePath}; run npm run test:coverage first.`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function measureDirectories() {
  const directories = Object.fromEntries(
    areas.map((area) => [area, Object.fromEntries(metrics.map((metric) => [metric, { covered: 0, total: 0 }]))]),
  );

  for (const area of areas) {
    const reportFile = area === 'components' ? componentReportPath : reportPath;
    const summary = loadJson(reportFile, `${area} coverage summary`);

    for (const [filePath, fileCoverage] of Object.entries(summary)) {
      if (filePath === 'total') continue;
      const relativePath = path.relative(sourceRoot, path.resolve(filePath));
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) continue;
      if (relativePath.split(path.sep)[0] !== area) continue;

      for (const metric of metrics) {
        const measured = fileCoverage[metric];
        if (!measured || !Number.isInteger(measured.covered) || !Number.isInteger(measured.total)) {
          throw new Error(`Coverage summary has invalid ${metric} counts for ${filePath}.`);
        }
        directories[area][metric].covered += measured.covered;
        directories[area][metric].total += measured.total;
      }
    }
  }

  for (const [area, measurements] of Object.entries(directories)) {
    for (const [metric, counts] of Object.entries(measurements)) {
      if (counts.total === 0) throw new Error(`Coverage summary has no ${metric} data for src/${area}.`);
    }
  }

  return directories;
}

function findRegressions(current, baseline, allowNewAreas = false) {
  const regressions = [];

  for (const area of areas) {
    if (allowNewAreas && !baseline?.[area]) continue;

    for (const metric of metrics) {
      const measured = current[area]?.[metric];
      const recorded = baseline[area]?.[metric];
      if (!measured || !recorded || recorded.total <= 0 || measured.total <= 0) {
        regressions.push(`${area}/${metric}: missing or invalid counts`);
        continue;
      }

      if (measured.covered * recorded.total < recorded.covered * measured.total) {
        const measuredPct = ((measured.covered / measured.total) * 100).toFixed(2);
        const baselinePct = ((recorded.covered / recorded.total) * 100).toFixed(2);
        regressions.push(`${area}/${metric}: ${measuredPct}% is below ${baselinePct}%`);
      }
    }
  }

  return regressions;
}

function main() {
  const directories = measureDirectories();
  const existing = fs.existsSync(baselinePath) ? loadJson(baselinePath, 'Coverage baseline') : null;

  if (isUpdate) {
    if (existing) {
      const regressions = findRegressions(directories, existing.directories, true);
      if (regressions.length > 0) {
        throw new Error(`Refusing to lower coverage baseline:\n${regressions.map((entry) => `- ${entry}`).join('\n')}`);
      }
    }

    const baseline = {
      _comment:
        'Per-area coverage floor. Update only after intentional improvement; includes engine, utils, store, hooks, and components.',
      _updated: new Date().toISOString().slice(0, 10),
      directories,
    };
    fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    console.log(`Coverage baseline updated: ${path.relative(repoRoot, baselinePath)}`);
    return;
  }

  if (!existing?.directories)
    throw new Error(`Coverage baseline not found at ${baselinePath}; run npm run test:coverage:ratchet:update.`);
  const regressions = findRegressions(directories, existing.directories);
  if (regressions.length > 0) {
    console.error('Coverage ratchet failed:');
    for (const regression of regressions) console.error(`- ${regression}`);
    process.exitCode = 1;
    return;
  }

  console.log('Coverage ratchet passed for engine, utils, store, hooks, and components.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
