/**
 * i18n coverage report — compares en.json and he.json key structures.
 * Run: node scripts/i18n-coverage.js
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const enPath = resolve(__dirname, '../src/i18n/en.json');
const hePath = resolve(__dirname, '../src/i18n/he.json');

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const he = JSON.parse(readFileSync(hePath, 'utf8'));

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
  return keys.sort();
}

const enKeys = collectKeys(en);
const heKeys = collectKeys(he);

const missingInHe = enKeys.filter((k) => !heKeys.includes(k));
const missingInEn = heKeys.filter((k) => !enKeys.includes(k));
const extraInHe = heKeys.filter((k) => !enKeys.includes(k));

console.log('🌐 i18n Coverage Report');
console.log('='.repeat(50));
console.log(`EN keys: ${enKeys.length}`);
console.log(`HE keys: ${heKeys.length}`);
console.log(`Parity:  ${enKeys.length === heKeys.length ? '✅ Match' : '❌ Mismatch'}`);

if (missingInHe.length > 0) {
  console.log(`\n⚠️  Missing in HE (${missingInHe.length}):`);
  missingInHe.forEach((k) => console.log(`  - ${k}`));
}

if (missingInEn.length > 0) {
  console.log(`\n⚠️  Missing in EN (${missingInEn.length}):`);
  missingInEn.forEach((k) => console.log(`  - ${k}`));
}

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
checkEmpty(en, 'en');
checkEmpty(he, 'he');

if (emptyCount === 0) {
  console.log('\n✅ No empty translation values found.');
}

const coverage =
  ((Math.min(enKeys.length, heKeys.length) -
    missingInHe.length -
    extraInHe.length +
    Math.min(enKeys.length, heKeys.length)) /
    (enKeys.length + heKeys.length)) *
  100;
console.log(`\n📊 Coverage: ${coverage.toFixed(1)}%`);

if (missingInHe.length > 0 || missingInEn.length > 0) {
  process.exit(1);
}
