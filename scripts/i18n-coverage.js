/**
 * i18n coverage report — compares all locale key structures against en.json.
 * Run: node scripts/i18n-coverage.js
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localeDir = resolve(__dirname, '../src/i18n');
const localeFiles = readdirSync(localeDir).filter((file) => /^[a-z]{2}(?:-[A-Z]{2})?\.json$/.test(file));
const locales = Object.fromEntries(
  localeFiles.map((file) => [file.slice(0, -5), JSON.parse(readFileSync(resolve(localeDir, file), 'utf8'))]),
);
const en = locales.en;

if (!en) {
  throw new Error('Missing reference locale: src/i18n/en.json');
}

function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys.push(...collectKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort((left, right) => left.localeCompare(right));
}

const enKeys = collectKeys(en);
const enKeySet = new Set(enKeys);
let failed = false;
let coveredKeys = enKeys.length;
let expectedKeys = enKeys.length;

console.log('i18n Coverage Report');
console.log('='.repeat(50));
console.log(`EN keys: ${enKeys.length}`);

// Check for empty values
let emptyCount = 0;
function checkEmpty(obj, lang, prefix = '') {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      checkEmpty(obj[key], lang, fullKey);
    } else if (typeof obj[key] === 'string' && obj[key].trim() === '') {
      console.log(`  ⚠️  Empty: ${lang}.${fullKey}`);
      emptyCount++;
    }
  }
}
for (const [locale, translations] of Object.entries(locales)) {
  checkEmpty(translations, locale);
}

if (emptyCount === 0) {
  console.log('\n✅ No empty translation values found.');
}

for (const [locale, translations] of Object.entries(locales)) {
  if (locale === 'en') continue;

  const localeKeys = collectKeys(translations);
  const localeKeySet = new Set(localeKeys);
  const missing = enKeys.filter((key) => !localeKeySet.has(key));
  const extra = localeKeys.filter((key) => !enKeySet.has(key));
  const matched = enKeys.length - missing.length;

  coveredKeys += matched;
  expectedKeys += enKeys.length;
  failed ||= missing.length > 0 || extra.length > 0;

  console.log(`${locale.toUpperCase()} keys: ${localeKeys.length}`);
  console.log(`  Parity: ${missing.length === 0 && extra.length === 0 ? 'Match' : 'Mismatch'}`);

  for (const [label, keys] of [
    ['Missing', missing],
    ['Extra', extra],
  ]) {
    if (keys.length > 0) {
      console.log(`  ${label} in ${locale.toUpperCase()} (${keys.length}):`);
      keys.forEach((key) => console.log(`    - ${key}`));
    }
  }
}

failed ||= emptyCount > 0;
const coverage = (coveredKeys / expectedKeys) * 100;
console.log(`\nCoverage: ${coverage.toFixed(1)}%`);

if (failed) process.exit(1);
