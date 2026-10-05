#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {Record<string, import('./bundle-critical.js').ManifestChunk>} manifest */
export function collectCriticalAssets(manifest) {
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry && manifest[key].src === 'index.html');
  if (!entryKey) throw new Error('Could not find the index.html entry in the Vite manifest.');

  const javascript = new Set();
  const stylesheets = new Set();
  const visited = new Set();

  function visit(key) {
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Static import '${key}' is missing from the Vite manifest.`);
    visited.add(key);
    if (/\.(?:m?js)$/i.test(chunk.file)) javascript.add(chunk.file);
    for (const stylesheet of chunk.css ?? []) stylesheets.add(stylesheet);
    for (const importedKey of chunk.imports ?? []) visit(importedKey);
  }

  visit(entryKey);
  return { javascript: [...javascript].sort(), stylesheets: [...stylesheets].sort() };
}

/** @param {Record<string, import('./bundle-critical.js').ManifestChunk>} manifest @param {string} distDirectory */
export function measureCriticalBundle(manifest, distDirectory) {
  const assets = collectCriticalAssets(manifest);
  const measure = (files) =>
    files.reduce((total, file) => {
      const content = readFileSync(resolve(distDirectory, file));
      return (
        total +
        brotliCompressSync(content, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
        }).length
      );
    }, 0);

  return {
    javascriptBrotliBytes: measure(assets.javascript),
    stylesheetBrotliBytes: measure(assets.stylesheets),
    ...assets,
  };
}

/** @param {{ javascriptBrotliBytes: number, stylesheetBrotliBytes: number }} measured @param {{ initialJsBrotliKB: number, initialCssBrotliKB: number }} budget */
export function getCriticalBundleViolations(measured, budget) {
  for (const [name, limit] of Object.entries(budget)) {
    if (!Number.isFinite(limit) || limit <= 0) throw new Error(`Critical bundle budget '${name}' must be a positive number.`);
  }

  const javascriptKB = measured.javascriptBrotliBytes / 1024;
  const stylesheetKB = measured.stylesheetBrotliBytes / 1024;
  const violations = [];
  if (javascriptKB > budget.initialJsBrotliKB) {
    violations.push(`Initial-route JS ${javascriptKB.toFixed(1)} KiB Brotli exceeds ${budget.initialJsBrotliKB} KiB.`);
  }
  if (stylesheetKB > budget.initialCssBrotliKB) {
    violations.push(
      `Initial-route CSS ${stylesheetKB.toFixed(1)} KiB Brotli exceeds ${budget.initialCssBrotliKB} KiB.`,
    );
  }
  return violations;
}

function run() {
  const manifestPath = resolve(root, 'dist/.vite/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const budgetConfig = JSON.parse(readFileSync(resolve(root, 'config/bundle-budget.json'), 'utf8'));
  const measured = measureCriticalBundle(manifest, resolve(root, 'dist'));
  const violations = getCriticalBundleViolations(measured, budgetConfig.critical);

  console.log('Critical initial-route bundle (Brotli quality 5)');
  console.log(
    `  JavaScript: ${(measured.javascriptBrotliBytes / 1024).toFixed(1)} / ${budgetConfig.critical.initialJsBrotliKB} KiB`,
  );
  console.log(
    `  Stylesheet: ${(measured.stylesheetBrotliBytes / 1024).toFixed(1)} / ${budgetConfig.critical.initialCssBrotliKB} KiB`,
  );

  if (violations.length > 0) {
    for (const violation of violations) console.error(`  FAIL: ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log('Critical-route budgets passed.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
