import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localeCodes = ['en', 'he', 'ar', 'de', 'es', 'fr'];
const identicalRatioThreshold = 0.02;
const showAllKeys = process.argv.includes('--all');
const localeDirectory = optionValue('--locale-dir', resolve(root, 'src/i18n'));
const customAudit = process.argv.includes('--locale-dir') || process.argv.includes('--allowlist');
const locales = Object.fromEntries(
  localeCodes.map((locale) => [locale, flatten(readJson(resolve(localeDirectory, `${locale}.json`)))]),
);
const allowlistData = readJson(optionValue('--allowlist', resolve(root, 'config/i18n-allowlist.json')));
const allowlistedIdenticalKeys = new Set(allowlistData.identical ?? []);
const allowlistedTokens = new Set(allowlistData.tokens ?? []);
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
  const missing = referenceKeys.filter((key) => !(key in target) && !hasPluralSibling(target, key)).sort();
  const extra = Object.keys(target)
    .filter((key) => !(key in reference) && !hasPluralSibling(reference, key))
    .sort();
  const empty = Object.entries(target)
    .filter(([, value]) => value.trim() === '')
    .map(([key]) => key)
    .sort();
  const placeholderKeys = referenceKeys.filter((key) => !pluralFamily(key) || key.endsWith('_other'));
  const placeholderMismatches = placeholderKeys
    .filter((key) => {
      const targetKey = key in target ? key : matchingPluralSibling(target, key);
      return targetKey !== undefined && !samePlaceholders(reference[key], target[targetKey]);
    })
    .sort();
  const eligibleKeys = Object.keys(target).filter((key) => key in reference && !allowlistedIdenticalKeys.has(key));
  const identicalKeys = eligibleKeys.filter(
    (key) => target[key] === reference[key] && !allowlistedTokens.has(target[key]),
  );
  const ratioDenominator = customAudit ? Object.keys(target).length : eligibleKeys.length;
  const identicalRatio = ratioDenominator === 0 ? 0 : identicalKeys.length / ratioDenominator;

  if (customAudit) {
    console.log(
      `\n[${locale}] keys=${Object.keys(target).length} missing=${missing.length} extra=${extra.length} empty=${empty.length} placeholders=${placeholderMismatches.length} EN-identical=${identicalKeys.length}/${ratioDenominator} (${(identicalRatio * 100).toFixed(2)}%)`,
    );
    printCustomKeys('Missing keys', missing);
    printCustomKeys('Extra keys', extra);
    printCustomKeys('Empty keys', empty);
    for (const key of placeholderMismatches) {
      const targetKey = key in target ? key : matchingPluralSibling(target, key);
      if (targetKey) {
        console.log(
          `${key} EN=[${placeholders(reference[key]).join(', ')}] ${locale}=[${placeholders(target[targetKey]).join(', ')}]`,
        );
      }
    }
  } else {
    console.log(
      `\n[${locale}] missing: ${missing.length}; extra: ${extra.length}; empty: ${empty.length}; placeholder mismatches: ${placeholderMismatches.length}; EN-identical: ${identicalKeys.length}/${eligibleKeys.length} (${(identicalRatio * 100).toFixed(2)}%)`,
    );
    printKeys('Missing', missing);
    printKeys('Extra', extra);
    printKeys('Empty', empty);
    printKeys('Placeholder mismatches', placeholderMismatches);
    printKeys('EN-identical samples', identicalKeys);
  }

  failed ||=
    missing.length > 0 ||
    extra.length > 0 ||
    empty.length > 0 ||
    placeholderMismatches.length > 0 ||
    identicalRatio > identicalRatioThreshold;
}

console.log(
  failed
    ? `\nResult: ${customAudit ? 'locale completeness checks failed' : `locale completeness thresholds not met (EN-identical limit: ${(identicalRatioThreshold * 100).toFixed(0)}%).`}`
    : customAudit
      ? '\nResult: all locale completeness checks pass.'
      : '\nResult: locale completeness thresholds met.',
);
if (failed) process.exitCode = 1;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : resolve(process.argv[index + 1]);
}

function pluralFamily(key) {
  const match = key.match(/^(.*)_(?:zero|one|two|few|many|other)$/);
  return match?.[1];
}

function hasPluralSibling(source, key) {
  const family = pluralFamily(key);
  return Boolean(family && Object.keys(source).some((candidate) => pluralFamily(candidate) === family));
}

function matchingPluralSibling(source, key) {
  const family = pluralFamily(key);
  if (!family) return undefined;
  const candidates = Object.keys(source).filter((candidate) => pluralFamily(candidate) === family);
  return candidates.find((candidate) => candidate.endsWith('_other')) ?? candidates[0];
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

function printCustomKeys(label, keys) {
  if (keys.length > 0) console.log(`${label}: ${keys.length} (${keys.join(', ')})`);
}
