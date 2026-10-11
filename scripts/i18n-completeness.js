import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localeCodes = ['en', 'he', 'ar', 'de', 'es', 'fr'];
const identicalRatioThreshold = 0.02;
const showAllKeys = process.argv.includes('--all');
const locales = Object.fromEntries(
  localeCodes.map((locale) => [locale, flatten(readJson(resolve(root, `src/i18n/${locale}.json`)))]),
);
const allowlistData = readJson(resolve(root, 'config/i18n-allowlist.json'));
const allowlistedIdenticalKeys = new Set(allowlistData.identical);
const reference = locales.en;
const invalidAllowlistKeys = [...allowlistedIdenticalKeys].filter((key) => !(key in reference));
const maxSamples = 8;
let failed = invalidAllowlistKeys.length > 0;

console.log('i18n completeness (reference: en)');
console.log('='.repeat(52));
if (showAllKeys) console.log('Detailed key lists enabled.');

if (invalidAllowlistKeys.length > 0) {
  printKeys('Allowlist keys not found in EN', invalidAllowlistKeys);
}

for (const locale of localeCodes.filter((code) => code !== 'en')) {
  const target = locales[locale];
  const referenceKeys = Object.keys(reference);
  const missing = referenceKeys.filter((key) => !(key in target)).sort();
  const extra = Object.keys(target)
    .filter((key) => !(key in reference))
    .sort();
  const empty = Object.entries(target)
    .filter(([, value]) => value.trim() === '')
    .map(([key]) => key)
    .sort();
  const placeholderMismatches = referenceKeys
    .filter((key) => key in target && !samePlaceholders(reference[key], target[key]))
    .sort();
  const eligibleKeys = Object.keys(target).filter((key) => key in reference && !allowlistedIdenticalKeys.has(key));
  const identicalKeys = eligibleKeys.filter((key) => key in target && target[key] === reference[key]);
  const identicalRatio = eligibleKeys.length === 0 ? 0 : identicalKeys.length / eligibleKeys.length;

  console.log(
    `\n[${locale}] missing: ${missing.length}; extra: ${extra.length}; empty: ${empty.length}; placeholder mismatches: ${placeholderMismatches.length}; EN-identical: ${identicalKeys.length}/${eligibleKeys.length} (${(identicalRatio * 100).toFixed(2)}%)`,
  );
  printKeys('Missing', missing);
  printKeys('Extra', extra);
  printKeys('Empty', empty);
  printKeys('Placeholder mismatches', placeholderMismatches);
  printKeys('EN-identical samples', identicalKeys);

  failed ||=
    missing.length > 0 ||
    extra.length > 0 ||
    empty.length > 0 ||
    placeholderMismatches.length > 0 ||
    identicalRatio > identicalRatioThreshold;
}

console.log(
  failed
    ? `\nResult: locale completeness thresholds not met (EN-identical limit: ${(identicalRatioThreshold * 100).toFixed(0)}%).`
    : '\nResult: locale completeness thresholds met.',
);
if (failed) process.exitCode = 1;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function flatten(value, prefix = '', result = {}) {
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      result[fullKey] = child;
    } else if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, fullKey, result);
    }
  }
  return result;
}

function placeholders(value) {
  return [...value.matchAll(/{{\s*-?\s*([^,\s}]+)(?:\s*,[^{}]*)?}}/g)].map((match) => match[1]).sort();
}

function samePlaceholders(referenceValue, targetValue) {
  const referencePlaceholders = placeholders(referenceValue);
  const targetPlaceholders = placeholders(targetValue);
  return (
    referencePlaceholders.length === targetPlaceholders.length &&
    referencePlaceholders.every((placeholder, index) => placeholder === targetPlaceholders[index])
  );
}

function printKeys(label, keys) {
  if (keys.length === 0) return;
  const displayed = showAllKeys ? keys : keys.slice(0, maxSamples);
  console.log(
    `  ${label} (${keys.length}): ${displayed.join(', ')}${!showAllKeys && keys.length > maxSamples ? ', ...' : ''}`,
  );
}
