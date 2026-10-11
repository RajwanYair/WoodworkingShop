import { useTranslation } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import i18n from '../src/i18n';
import { renderWithLocale } from './render-with-locale';

function LocaleProbe() {
  const { i18n: localizedI18n } = useTranslation();
  return <output aria-label="Current locale">{localizedI18n.language}</output>;
}

describe('renderWithLocale', () => {
  it.each([
    { locale: 'en', direction: 'ltr' },
    { locale: 'he', direction: 'rtl' },
    { locale: 'ar', direction: 'rtl' },
  ] as const)(
    'renders $locale with $direction direction without changing app locale',
    async ({ locale, direction }) => {
      const appLocale = i18n.language;

      await renderWithLocale(<LocaleProbe />, locale);

      expect(screen.getByLabelText('Current locale')).toHaveTextContent(locale);
      expect(document.documentElement.dir).toBe(direction);
      expect(i18n.language).toBe(appLocale);
    },
  );
});
