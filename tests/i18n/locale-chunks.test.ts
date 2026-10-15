import { describe, expect, it } from 'vitest';
import { namespaces as english } from '../../src/i18n/locale-chunks/en';
import { FEATURE_NAMESPACES, I18N_LOCALES, I18N_NAMESPACES } from '../../src/i18n/namespace-catalog';

describe('locale chunks', () => {
  it('keeps every English namespace in one locale module', () => {
    expect(I18N_LOCALES).toEqual(['en', 'he', 'ar', 'de', 'es', 'fr']);
    expect(Object.keys(english).sort()).toEqual([...I18N_NAMESPACES].sort());
    expect(english.app).toEqual(expect.any(Object));
  });

  it('loads the always-visible summary namespaces with the workspace shell', () => {
    expect(FEATURE_NAMESPACES.workspace).toEqual(
      expect.arrayContaining(['cost', 'costSummary', 'costVariance', 'shelfSpacingPanel']),
    );
  });
});
