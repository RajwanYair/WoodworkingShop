import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const localeCodes = ['en', 'he', 'ar', 'de', 'es', 'fr'] as const;
const temporaryDirectories: string[] = [];
const scriptPath = resolve('scripts/i18n-completeness.js');

function runAudit(locales: Record<string, object>) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'woodworkingshop-i18n-'));
  temporaryDirectories.push(temporaryDirectory);
  const localeDirectory = join(temporaryDirectory, 'locales');
  mkdirSync(localeDirectory);
  for (const locale of localeCodes) {
    writeFileSync(join(localeDirectory, `${locale}.json`), JSON.stringify(locales[locale]));
  }
  const allowlistPath = join(temporaryDirectory, 'allowlist.json');
  writeFileSync(allowlistPath, JSON.stringify({ tokens: ['mm'] }));

  return spawnSync(process.execPath, [scriptPath, '--locale-dir', localeDirectory, '--allowlist', allowlistPath], {
    encoding: 'utf8',
  });
}

function completeLocale(message: string, singularItem: string, pluralItems: string): object {
  return { message, item_one: singularItem, item_other: pluralItems, unit: 'mm' };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('i18n completeness CLI', () => {
  it('accepts translated placeholders, locale-specific plural forms, and allowlisted tokens', () => {
    const result = runAudit({
      en: completeLocale('Hello {{name}}', '{{count}} item', '{{count}} items'),
      he: completeLocale('שלום {{name}}', '{{count}} פריט', '{{count}} פריטים'),
      ar: {
        message: 'مرحبا {{name}}',
        item_zero: '{{count}} عنصر',
        item_one: '{{count}} عنصر',
        item_two: '{{count}} عنصران',
        item_few: '{{count}} عناصر',
        item_many: '{{count}} عنصر',
        item_other: '{{count}} عنصر',
        unit: 'mm',
      },
      de: completeLocale('Hallo {{name}}', '{{count}} Teil', '{{count}} Teile'),
      es: completeLocale('Hola {{name}}', '{{count}} elemento', '{{count}} elementos'),
      fr: completeLocale('Bonjour {{name}}', '{{count}} article', '{{count}} articles'),
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[ar] keys=8 missing=0 extra=0 empty=0 placeholders=0');
    expect(result.stdout).toContain('Result: all locale completeness checks pass.');
  });

  it('reports missing, extra, untranslated, and placeholder-mismatched entries', () => {
    const result = runAudit({
      en: { ...completeLocale('Hello {{name}}', '{{count}} item', '{{count}} items'), intro: 'Welcome' },
      he: { message: 'Hello {{name}}', item_other: '{{amount}} פריטים', unit: 'mm', extra: 'ערך' },
      ar: { ...completeLocale('مرحبا {{name}}', '{{count}} عنصر', '{{count}} عناصر'), intro: 'مرحبا' },
      de: { ...completeLocale('Hallo {{name}}', '{{count}} Teil', '{{count}} Teile'), intro: 'Willkommen' },
      es: { ...completeLocale('Hola {{name}}', '{{count}} elemento', '{{count}} elementos'), intro: 'Bienvenido' },
      fr: { ...completeLocale('Bonjour {{name}}', '{{count}} article', '{{count}} articles'), intro: 'Bienvenue' },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[he] keys=4 missing=1 extra=1 empty=0 placeholders=1 EN-identical=1/4 (25.00%)');
    expect(result.stdout).toContain('Missing keys: 1 (intro)');
    expect(result.stdout).toContain('Extra keys: 1 (extra)');
    expect(result.stdout).toContain('item_other EN=[count] he=[amount]');
  });
});
