import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadLocaleFiles(locale: string): Record<string, unknown> {
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), `../../src/i18n/${locale}`);
  const merged: Record<string, unknown> = {};
  for (const file of readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    merged[file.slice(0, -5)] = JSON.parse(readFileSync(resolve(directory, file), 'utf8')) as unknown;
  }
  return merged;
}
