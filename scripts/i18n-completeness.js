import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const localeCodes = ['en', 'he', 'ar', 'de', 'es', 'fr'];
const maxIdenticalRatio = 2;
const args = process.argv.slice(2);

function getOption(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value) throw new Error(`Missing value for ${name}`);
  return resolve(value);
}

function flattenLocale(tree, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenLocale(value, fullKey, result);
    } else {
      throw new Error(`Translation value at ${fullKey} must be a string or nested object`);
    }
  }
  return result;
}

function getPlaceholders(value) {
  return [...value.matchAll(/\{\{\s*[-&]?\s*([^,}\s]+)(?:\s*,[^}]*)?\s*\}\}/g)].map((match) => match[1]).sort();
}

function getPluralBase(key) {
  const match = /^(.*)_(zero|one|two|few|many|other)$/.exec(key);
  return match ? { base: match[1] } : null;
}

function getReferenceValue(key, reference) {
  if (Object.prototype.hasOwnProperty.call(reference, key)) return reference[key];
  const plural = getPluralBase(key);
  if (!plural) return undefined;
  if (Object.prototype.hasOwnProperty.call(reference, `${plural.base}_other`)) return reference[`${plural.base}_other`];
  if (Object.prototype.hasOwnProperty.call(reference, plural.base)) return reference[plural.base];
  const sibling = Object.keys(reference).find((candidate) => getPluralBase(candidate)?.base === plural.base);
  return sibling ? reference[sibling] : undefined;
}

function listIssues(label, values) {
  if (values.length === 0) return;
  const shown = values.slice(0, 12);
  console.log(`  ${label}: ${values.length} (${shown.join(', ')}${values.length > shown.length ? ', …' : ''})`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  const localeDir = getOption('--locale-dir', resolve(scriptDir, '../src/i18n'));
  const allowlistPath = getOption('--allowlist', resolve(scriptDir, '../config/i18n-allowlist.json'));
  const allowlistData = readJson(allowlistPath);
  if (!Array.isArray(allowlistData.tokens) || !allowlistData.tokens.every((token) => typeof token === 'string')) {
    throw new Error('The i18n allowlist must contain a tokens array of strings');
  }
  const allowlistedTokens = new Set(allowlistData.tokens);
  const locales = {};

  for (const locale of localeCodes) {
    const path = resolve(localeDir, `${locale}.json`);
    if (!existsSync(path)) throw new Error(`Missing locale file: ${path}`);
    locales[locale] = flattenLocale(readJson(path));
  }

  const reference = locales.en;
  const referenceKeys = Object.keys(reference).sort();
  const eligibleKeys = referenceKeys.filter((key) => !allowlistedTokens.has(reference[key]));
  const referenceEmpty = referenceKeys.filter((key) => reference[key].trim() === '');
  let failed = referenceEmpty.length > 0;

  console.log(`i18n completeness (EN reference, EN-identical limit ${maxIdenticalRatio}%)`);
  console.log(`Reference keys: ${referenceKeys.length}; allowlisted token values: ${allowlistedTokens.size}`);
  listIssues('Empty EN values', referenceEmpty);

  for (const locale of localeCodes.filter((code) => code !== 'en')) {
    const target = locales[locale];
    const targetKeys = Object.keys(target);
    const targetKeySet = new Set(targetKeys);
    const referenceKeySet = new Set(referenceKeys);
    const referencePluralBases = new Set(referenceKeys.map((key) => getPluralBase(key)?.base).filter(Boolean));
    const targetPluralBases = new Set(targetKeys.map((key) => getPluralBase(key)?.base).filter(Boolean));
    const missing = referenceKeys.filter((key) => {
      const plural = getPluralBase(key);
      return !targetKeySet.has(key) && (!plural || !targetPluralBases.has(plural.base));
    });
    const extra = targetKeys
      .filter((key) => {
        const plural = getPluralBase(key);
        return !referenceKeySet.has(key) && (!plural || !referencePluralBases.has(plural.base));
      })
      .sort();
    const empty = targetKeys.filter((key) => target[key].trim() === '').sort();
    const identical = eligibleKeys.filter((key) => target[key] === reference[key]);
    const ratio = eligibleKeys.length === 0 ? 0 : (identical.length / eligibleKeys.length) * 100;
    const placeholderMismatches = targetKeys.flatMap((key) => {
      const expectedValue = getReferenceValue(key, reference);
      if (expectedValue === undefined) return [];
      const expected = getPlaceholders(expectedValue);
      const actual = getPlaceholders(target[key]);
      return expected.join('\0') === actual.join('\0')
        ? []
        : [`${key} EN=[${expected.join(',')}] ${locale}=[${actual.join(',')}]`];
    });
    const localeFailed =
      missing.length > 0 ||
      extra.length > 0 ||
      empty.length > 0 ||
      placeholderMismatches.length > 0 ||
      ratio > maxIdenticalRatio;
    failed ||= localeFailed;

    console.log(
      `[${locale}] keys=${targetKeys.length} missing=${missing.length} extra=${extra.length} empty=${empty.length} placeholders=${placeholderMismatches.length} EN-identical=${identical.length}/${eligibleKeys.length} (${ratio.toFixed(2)}%)`,
    );
    listIssues('Missing keys', missing);
    listIssues('Extra keys', extra);
    listIssues('Empty values', empty);
    listIssues('Placeholder mismatches', placeholderMismatches);
    if (ratio > maxIdenticalRatio) listIssues('EN-identical keys', identical);
  }

  console.log(failed ? 'Result: locale completeness needs work.' : 'Result: all locale completeness checks pass.');
  if (failed) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
