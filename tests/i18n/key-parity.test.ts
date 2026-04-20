import { describe, it, expect } from 'vitest';
import en from '../../src/i18n/en.json';
import he from '../../src/i18n/he.json';

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      keys.push(...collectKeys(val as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('i18n key parity', () => {
  const enKeys = collectKeys(en);
  const heKeys = collectKeys(he);

  it('en.json and he.json have the same number of keys', () => {
    expect(enKeys.length).toBe(heKeys.length);
  });

  it('en.json and he.json have identical key structure', () => {
    expect(enKeys).toEqual(heKeys);
  });

  it('no en key is missing from he', () => {
    const missingInHe = enKeys.filter((k) => !heKeys.includes(k));
    expect(missingInHe).toEqual([]);
  });

  it('no he key is missing from en', () => {
    const missingInEn = heKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  it('all leaf values are non-empty strings', () => {
    function checkLeaves(obj: Record<string, unknown>, lang: string, prefix = '') {
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const val = obj[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          checkLeaves(val as Record<string, unknown>, lang, fullKey);
        } else {
          expect(typeof val, `${lang}.${fullKey} should be a string`).toBe('string');
          expect((val as string).trim().length, `${lang}.${fullKey} should not be empty`).toBeGreaterThan(0);
        }
      }
    }
    checkLeaves(en, 'en');
    checkLeaves(he, 'he');
  });
});
