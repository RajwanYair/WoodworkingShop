import { describe, expect, it } from 'vitest';
import { createPseudoLocale } from '../../src/i18n/pseudo-locales';

describe('createPseudoLocale', () => {
  it('accents and expands every English string by at least 40 percent', () => {
    const source = { actions: { save: 'Save', cancel: 'Cancel' }, count: '12 items' };
    const pseudo = createPseudoLocale(source, 'en-XA');

    expect(pseudo).toEqual({
      actions: {
        save: 'Sávë··',
        cancel: 'Cáncël···',
      },
      count: '12 ïtëms····',
    });
    expect(pseudo.actions.save.length).toBeGreaterThanOrEqual(Math.ceil(source.actions.save.length * 1.4));
    expect(pseudo.actions.cancel.length).toBeGreaterThanOrEqual(Math.ceil(source.actions.cancel.length * 1.4));
  });

  it('wraps Arabic pseudo-locale strings in directional isolates', () => {
    const pseudo = createPseudoLocale({ actions: { save: 'Save' }, count: '12 items' }, 'ar-XB');

    expect(pseudo).toEqual({
      actions: { save: '\u2067Save\u2069' },
      count: '\u206712 items\u2069',
    });
  });

  it('preserves interpolation tokens while expanding surrounding text', () => {
    const pseudo = createPseudoLocale({ count: '{{count}} items' }, 'en-XA');

    expect(pseudo.count).toBe('{{count}} ïtëms······');
  });
});
