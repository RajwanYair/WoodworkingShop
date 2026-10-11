import { describe, expect, it } from 'vitest';
import { resolveEngineLang } from '../../src/components/optimizer/resolve-engine-lang';

describe('resolveEngineLang', () => {
  it.each([
    ['en', 'en'],
    ['he', 'he'],
    ['ar', 'he'],
    ['es', 'en'],
    ['de', 'en'],
    ['fr', 'en'],
  ])('maps UI locale %s to engine locale %s', (uiLanguage, expected) => {
    expect(resolveEngineLang(uiLanguage)).toBe(expected);
  });
});
