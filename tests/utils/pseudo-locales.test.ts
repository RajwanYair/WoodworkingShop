import { describe, expect, it } from 'vitest';
import { pseudoLocalize } from '../e2e/pseudo-locales';

describe('pseudoLocalize', () => {
  it('expands accented English while preserving interpolation tokens', () => {
    const source = 'Cabinet width is ready';
    const result = pseudoLocalize(source, 'en-XA');
    const withToken = pseudoLocalize('Cabinet width {{width}} is ready', 'en-XA');

    expect(result.length).toBeGreaterThanOrEqual(source.length * 1.4);
    expect(pseudoLocalize(source, 'en-XA')).toBe(result);
    expect(result).toContain('［Çáƀíńéŧ');
    expect(result).toContain('］');
    expect(withToken).toContain('{{width}}');
  });

  it('wraps Arabic stress text with bidi controls without changing placeholders', () => {
    const result = pseudoLocalize('عرض {{width}} ملم', 'ar-XB');

    expect(result).toBe('\u202bعرض \u202c{{width}}\u202b ملم\u202c');
    expect(result).toContain('{{width}}');
  });
});
