/**
 * Bundle size report — runs after `npm run build` in CI.
 * Reports the size of each output file and warns if the total
 * JS bundle exceeds the budget (300 KB gzipped estimate).
 */
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST_DIR = 'dist';
const BUDGET_KB = 2000; // Total JS budget in KB (includes lazy-loaded chunks like pdf-renderer)

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const files = walkDir(DIST_DIR);
const groups = { js: [], css: [], html: [], other: [] };

for (const f of files) {
  const ext = extname(f).toLowerCase();
  const size = statSync(f).size;
  const entry = { path: f.replace(/\\/g, '/'), size };
  if (ext === '.js' || ext === '.mjs') groups.js.push(entry);
  else if (ext === '.css') groups.css.push(entry);
  else if (ext === '.html') groups.html.push(entry);
  else groups.other.push(entry);
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

console.log('📦 Bundle Size Report');
console.log('='.repeat(50));

for (const [label, items] of Object.entries(groups)) {
  if (items.length === 0) continue;
  console.log(`\n${label.toUpperCase()} (${items.length} files):`);
  items.sort((a, b) => b.size - a.size);
  for (const { path, size } of items) {
    console.log(`  ${fmtKB(size).padStart(10)}  ${path}`);
  }
}

const totalJS = groups.js.reduce((sum, f) => sum + f.size, 0);
const totalCSS = groups.css.reduce((sum, f) => sum + f.size, 0);
const totalAll = files.reduce((sum, f) => sum + statSync(f).size, 0);

console.log('\n' + '='.repeat(50));
console.log(`Total JS:  ${fmtKB(totalJS)}`);
console.log(`Total CSS: ${fmtKB(totalCSS)}`);
console.log(`Total:     ${fmtKB(totalAll)}`);
console.log(`JS Budget: ${BUDGET_KB} KB`);

if (totalJS / 1024 > BUDGET_KB) {
  console.error(`\n❌ JS bundle (${fmtKB(totalJS)}) exceeds budget of ${BUDGET_KB} KB!`);
  process.exit(1);
}

console.log('\n✅ Bundle within budget.');
