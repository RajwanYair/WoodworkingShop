/**
 * Bundle size report & budget enforcer — runs after `npm run build` in CI.
 *
 * Budgets are loaded from config/bundle-budget.json (versioned alongside source).
 * Process exits non-zero on any budget violation.
 *
 * Checks:
 *   - Total JS size
 *   - Total CSS size
 *   - Total dist size
 *   - Per-file budget (configurable per chunk name prefix, with default fallback)
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import { getInitialRouteFiles } from './bundle-graph.js';

const DIST_DIR = process.env['WOODWORKINGSHOP_BUNDLE_DIST_DIR'] ?? 'dist';
const BUDGET_FILE = 'config/bundle-budget.json';
const MANIFEST_FILE = join(DIST_DIR, '.vite', 'manifest.json');
const JAVASCRIPT_FILE_PATTERN = /\.(?:js|mjs)$/i;
const criticalOnly = process.argv.includes('--critical');

const budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));

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

const files = walkDir(DIST_DIR).filter((file) => file !== MANIFEST_FILE);
const groups = { js: [], css: [], html: [], other: [] };

for (const f of files) {
  const ext = extname(f).toLowerCase();
  const content = readFileSync(f);
  const size = content.length;
  const brotliSize = brotliCompressSync(content).length;
  const entry = { path: f.replaceAll('\\', '/'), size, brotliSize };
  if (ext === '.js' || ext === '.mjs') groups.js.push(entry);
  else if (ext === '.css') groups.css.push(entry);
  else if (ext === '.html') groups.html.push(entry);
  else groups.other.push(entry);
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

function fileBudgetKB(path) {
  const name = basename(path).toLowerCase();
  for (const [prefix, kb] of Object.entries(budget.perFileKB)) {
    if (prefix === '_default') continue;
    if (name.startsWith(prefix.toLowerCase())) return kb;
  }
  return budget.perFileKB._default;
}

if (!criticalOnly) {
  console.log('📦 Bundle Size Report');
  console.log('='.repeat(60));

  for (const [label, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    console.log(`\n${label.toUpperCase()} (${items.length} files):`);
    items.sort((a, b) => b.size - a.size);
    for (const { path, size, brotliSize } of items) {
      console.log(`  ${fmtKB(size).padStart(10)}  ${fmtKB(brotliSize).padStart(9)} Brotli  ${path}`);
    }
  }
}

const totalJS = groups.js.reduce((sum, f) => sum + f.size, 0);
const totalCSS = groups.css.reduce((sum, f) => sum + f.size, 0);
const totalAll = files.reduce((sum, f) => sum + statSync(f).size, 0);
const totalJSBrotli = groups.js.reduce((sum, f) => sum + f.brotliSize, 0);
const totalCSSBrotli = groups.css.reduce((sum, f) => sum + f.brotliSize, 0);
const totalAllBrotli = files.reduce((sum, f) => sum + brotliCompressSync(readFileSync(f)).length, 0);

if (!criticalOnly) {
  console.log('\n' + '='.repeat(60));
  console.log(`Total JS:  ${fmtKB(totalJS).padStart(12)}    Budget: ${budget.totalJsKB} KB`);
  console.log(`Total CSS: ${fmtKB(totalCSS).padStart(12)}    Budget: ${budget.totalCssKB} KB`);
  console.log(`Total:     ${fmtKB(totalAll).padStart(12)}    Budget: ${budget.totalAllKB} KB`);
  console.log(`Brotli JS: ${fmtKB(totalJSBrotli).padStart(12)}`);
  console.log(`Brotli CSS:${fmtKB(totalCSSBrotli).padStart(12)}`);
  console.log(`Brotli all:${fmtKB(totalAllBrotli).padStart(12)}`);
}

const violations = [];

const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'));
const initialRoute = getInitialRouteFiles(manifest);
const criticalPaths = [
  join(DIST_DIR, 'index.html'),
  ...initialRoute.javascript.map((file) => join(DIST_DIR, file)),
  ...initialRoute.stylesheets.map((file) => join(DIST_DIR, file)),
  ...initialRoute.assets.map((file) => join(DIST_DIR, file)),
];
const uniqueCriticalPaths = [...new Set(criticalPaths)];
const criticalStats = uniqueCriticalPaths.map((path) => {
  const content = readFileSync(path);
  return {
    path: path.replaceAll('\\', '/'),
    size: content.length,
    brotliSize: brotliCompressSync(content).length,
  };
});
const criticalRaw = criticalStats.reduce((sum, file) => sum + file.size, 0);
const criticalBrotli = criticalStats.reduce((sum, file) => sum + file.brotliSize, 0);
const criticalJS = criticalStats
  .filter((file) => JAVASCRIPT_FILE_PATTERN.test(file.path))
  .reduce((sum, file) => sum + file.size, 0);
const outsideRouteJS = totalJS - criticalJS;

console.log('\nInitial-route graph:');
console.log(`  ${criticalStats.length} files, ${fmtKB(criticalRaw)} raw, ${fmtKB(criticalBrotli)} Brotli`);
console.log(
  `  JavaScript outside initial route graph: ${fmtKB(outsideRouteJS)} (${((outsideRouteJS / totalJS) * 100).toFixed(1)}% of emitted JS)`,
);
console.log(`  Critical budgets: ${budget.critical.rawKB} KB raw / ${budget.critical.brotliKB} KB Brotli`);

if (!criticalOnly && totalJS / 1024 > budget.totalJsKB) {
  violations.push(`Total JS ${fmtKB(totalJS)} > ${budget.totalJsKB} KB`);
}
if (!criticalOnly && totalCSS / 1024 > budget.totalCssKB) {
  violations.push(`Total CSS ${fmtKB(totalCSS)} > ${budget.totalCssKB} KB`);
}
if (!criticalOnly && totalAll / 1024 > budget.totalAllKB) {
  violations.push(`Total ${fmtKB(totalAll)} > ${budget.totalAllKB} KB`);
}
if (criticalRaw / 1024 > budget.critical.rawKB) {
  violations.push(`Initial-route graph ${fmtKB(criticalRaw)} > ${budget.critical.rawKB} KB`);
}
if (criticalBrotli / 1024 > budget.critical.brotliKB) {
  violations.push(`Initial-route Brotli ${fmtKB(criticalBrotli)} > ${budget.critical.brotliKB} KB`);
}

if (!criticalOnly) {
  console.log('\nPer-file checks (JS):');
  for (const f of groups.js) {
    const limitKB = fileBudgetKB(f.path);
    const okSym = f.size / 1024 > limitKB ? '❌' : '✅';
    console.log(`  ${okSym} ${fmtKB(f.size).padStart(10)} / ${limitKB} KB    ${f.path}`);
    if (f.size / 1024 > limitKB) {
      violations.push(`${f.path} ${fmtKB(f.size)} > ${limitKB} KB`);
    }
  }
}

// Sprint 106 — per-asset budgets for static files (icons, images, etc.).
function assetBudgetKB(path) {
  const name = basename(path).toLowerCase();
  const perAsset = budget.perAssetKB ?? { _default: 50 };
  if (Object.keys(perAsset).includes(name)) return perAsset[name];
  return perAsset._default;
}

const staticAssets = groups.other.filter((f) => /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(f.path));
if (!criticalOnly && staticAssets.length > 0) {
  console.log('\nPer-asset checks (images/icons):');
  for (const f of staticAssets) {
    const limitKB = assetBudgetKB(f.path);
    const okSym = f.size / 1024 > limitKB ? '❌' : '✅';
    console.log(`  ${okSym} ${fmtKB(f.size).padStart(10)} / ${limitKB} KB    ${f.path}`);
    if (f.size / 1024 > limitKB) {
      violations.push(`${f.path} ${fmtKB(f.size)} > ${limitKB} KB`);
    }
  }
}

if (violations.length > 0) {
  console.error(`\n❌ Bundle budget violations (${violations.length}):`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error(`\nUpdate ${BUDGET_FILE} (with justification) or reduce bundle size.`);
  process.exit(1);
}

console.log(criticalOnly ? '\n✅ Initial-route budgets within limits.' : '\n✅ All budgets within limits.');
