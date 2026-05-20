/**
 * sync-sw-version.js — keeps all version strings across the repo in lockstep
 * with `package.json` `version`. Runs automatically as `prebuild` so that
 * every production build bakes the correct version everywhere.
 *
 * Files updated:
 *   - public/sw.js            APP_VERSION constant
 *   - docs/banner.svg         version badge text
 *   - docs/USER-GUIDE.md      Version header line (major.minor only)
 *   - index.html              Content Security Policy comment version
 *   - .github/SECURITY.md     Accessibility section header version
 *   - docs/ARCHITECTURE.md    Accessibility section header version
 *
 * Failure modes:
 *   - exits non-zero if `package.json` or `public/sw.js` is missing
 *   - exits non-zero if no `APP_VERSION = '...'` line is found in sw.js
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pkgPath = resolve(root, 'package.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
if (typeof version !== 'string' || version.length === 0) {
  console.error(`[sync-sw-version] package.json has no usable "version" field.`);
  process.exit(1);
}

// major.minor only (e.g. "3.54.0" -> "3.54"), used in USER-GUIDE.md
const majorMinor = version.split('.').slice(0, 2).join('.');

/** Replace a pattern in a file; log whether it changed. */
function syncFile(relPath, pattern, replacement) {
  const absPath = resolve(root, relPath);
  const original = readFileSync(absPath, 'utf8');
  const updated = original.replace(pattern, replacement);
  if (updated === original) {
    console.log(`[sync-sw-version] ${relPath} already up-to-date.`);
    return;
  }
  writeFileSync(absPath, updated, 'utf8');
  console.log(`[sync-sw-version] ${relPath} updated to ${version}.`);
}

// 1. public/sw.js — APP_VERSION constant
const swPath = resolve(root, 'public/sw.js');
const swOriginal = readFileSync(swPath, 'utf8');
const swRe = /const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]\s*;/;
if (!swRe.test(swOriginal)) {
  console.error(`[sync-sw-version] could not find APP_VERSION declaration in ${swPath}.`);
  process.exit(1);
}
syncFile('public/sw.js', swRe, `const APP_VERSION = '${version}';`);

// 2. docs/banner.svg — version badge: >vX.Y.Z</text>
syncFile('docs/banner.svg', />v\d+\.\d+\.\d+<\/text>/, `>v${version}</text>`);

// 3. docs/USER-GUIDE.md — "Version X.YY" header (major.minor only)
syncFile('docs/USER-GUIDE.md', /Version \d+\.\d+/, `Version ${majorMinor}`);

// 4. index.html — CSP comment version: "Content Security Policy (vX.Y.Z)"
syncFile('index.html', /Content Security Policy \(v\d+\.\d+\.\d+\)/, `Content Security Policy (v${version})`);

// 5. .github/SECURITY.md — accessibility section header
syncFile('.github/SECURITY.md', /Accessibility Security Stance — v\d+\.\d+\.\d+/, `Accessibility Security Stance — v${version}`);

// 6. docs/ARCHITECTURE.md — accessibility section header
syncFile('docs/ARCHITECTURE.md', /Accessibility \(WCAG 2\.2 AA\) — v\d+\.\d+\.\d+/, `Accessibility (WCAG 2.2 AA) — v${version}`);
