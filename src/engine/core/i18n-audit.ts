/**
 * Sprint 49 — i18n key audit engine.
 *
 * Compares a set of locale translation files (represented as nested key-value
 * records) to a reference locale and produces an audit report containing:
 *   - Keys missing from a locale (present in reference but absent in target).
 *   - Extra keys in a locale (present in target but absent in reference).
 *   - Empty / whitespace-only values in any locale.
 *
 * The engine works on flat dot-notation key spaces after flattening nested
 * objects, so `{ config: { width: "..." } }` becomes `{ "config.width": "..." }`.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Arbitrary depth JSON-style translation map. */
export type LocaleTree = {
  [key: string]: string | LocaleTree;
};

/** Flat key → string map. */
export type FlatLocale = Record<string, string>;

export interface LocaleAuditResult {
  locale: string;
  /** Keys present in reference but missing in this locale. */
  missingKeys: string[];
  /** Keys present in this locale but absent in reference. */
  extraKeys: string[];
  /** Keys whose value is an empty string or whitespace only. */
  emptyKeys: string[];
  /** Whether the locale has zero issues. */
  clean: boolean;
}

export interface AuditReport {
  referenceLocale: string;
  results: LocaleAuditResult[];
  /** True when every locale is clean. */
  allClean: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively flatten a nested translation tree to dot-notation keys.
 */
export function flattenLocale(tree: LocaleTree, prefix = ''): FlatLocale {
  const out: FlatLocale = {};
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[fullKey] = value;
    } else {
      Object.assign(out, flattenLocale(value as LocaleTree, fullKey));
    }
  }
  return out;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Audit a single locale flat map against a reference flat map.
 */
export function auditLocale(locale: string, flat: FlatLocale, referenceFlat: FlatLocale): LocaleAuditResult {
  const refKeys = new Set(Object.keys(referenceFlat));
  const targetKeys = new Set(Object.keys(flat));

  const missingKeys = [...refKeys].filter((k) => !targetKeys.has(k)).sort();
  const extraKeys = [...targetKeys].filter((k) => !refKeys.has(k)).sort();
  const emptyKeys = Object.entries(flat)
    .filter(([, v]) => v.trim() === '')
    .map(([k]) => k)
    .sort();

  return {
    locale,
    missingKeys,
    extraKeys,
    emptyKeys,
    clean: missingKeys.length === 0 && extraKeys.length === 0 && emptyKeys.length === 0,
  };
}

/**
 * Run a full audit across multiple locales against a reference.
 *
 * @param referenceLocale  Locale tag used as the source of truth (e.g. `'en'`).
 * @param locales          Map of locale tag → flat translation record.
 */
export function auditAllLocales(referenceLocale: string, locales: Record<string, FlatLocale>): AuditReport {
  const referenceFlat = locales[referenceLocale] ?? {};
  const results = Object.entries(locales)
    .filter(([tag]) => tag !== referenceLocale)
    .map(([tag, flat]) => auditLocale(tag, flat, referenceFlat));

  return {
    referenceLocale,
    results,
    allClean: results.every((r) => r.clean),
  };
}

/**
 * Format an audit report as a human-readable plain-text summary.
 */
export function formatAuditReport(report: AuditReport): string {
  if (report.results.length === 0) {
    return `Audit: reference locale '${report.referenceLocale}' only — nothing to compare.`;
  }

  const lines: string[] = [`i18n audit (reference: ${report.referenceLocale})`, '─'.repeat(50)];

  for (const r of report.results) {
    lines.push(`\n[${r.locale}] ${r.clean ? '✓ clean' : '✗ issues found'}`);
    if (r.missingKeys.length > 0) {
      lines.push(`  Missing keys (${r.missingKeys.length}):`);
      r.missingKeys.forEach((k) => lines.push(`    - ${k}`));
    }
    if (r.extraKeys.length > 0) {
      lines.push(`  Extra keys (${r.extraKeys.length}):`);
      r.extraKeys.forEach((k) => lines.push(`    + ${k}`));
    }
    if (r.emptyKeys.length > 0) {
      lines.push(`  Empty values (${r.emptyKeys.length}):`);
      r.emptyKeys.forEach((k) => lines.push(`    ~ ${k}`));
    }
  }

  lines.push('');
  lines.push(report.allClean ? 'Result: all locales are clean.' : 'Result: issues found.');
  return lines.join('\n');
}
