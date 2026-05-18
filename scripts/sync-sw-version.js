/**
 * sync-sw-version.js — keeps `public/sw.js` `APP_VERSION` in lockstep with
 * `package.json` `version`. Runs automatically as `prebuild` so that every
 * production build bakes the correct cache version into the service worker.
 *
 * Failure modes:
 *   - exits non-zero if `package.json` or `public/sw.js` is missing
 *   - exits non-zero if no `APP_VERSION = '...'` line is found in sw.js
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pkgPath = resolve(root, 'package.json');
const swPath = resolve(root, 'public/sw.js');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
if (typeof version !== 'string' || version.length === 0) {
  console.error(`[sync-sw-version] package.json has no usable "version" field.`);
  process.exit(1);
}

const original = readFileSync(swPath, 'utf8');
const re = /const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]\s*;/;
const match = original.match(re);
if (!match) {
  console.error(`[sync-sw-version] could not find APP_VERSION declaration in ${swPath}.`);
  process.exit(1);
}

if (match[1] === version) {
  console.log(`[sync-sw-version] sw.js APP_VERSION already ${version} — no change.`);
  process.exit(0);
}

const updated = original.replace(re, `const APP_VERSION = '${version}';`);
writeFileSync(swPath, updated, 'utf8');
console.log(`[sync-sw-version] sw.js APP_VERSION ${match[1]} -> ${version}.`);
