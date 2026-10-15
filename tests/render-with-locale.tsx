import { createInstance } from 'i18next';
import { afterEach } from 'vitest';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { RTL_LANGS } from '../src/i18n';
import { loadLocaleFiles } from './i18n/load-locale-files';

const en = loadLocaleFiles('en');
const he = loadLocaleFiles('he');
const ar = loadLocaleFiles('ar');

export type TestLocale = 'en' | 'he' | 'ar';

let originalDirection: string | null = null;

afterEach(() => {
  if (originalDirection !== null) {
    document.documentElement.dir = originalDirection;
    originalDirection = null;
  }
});

export async function renderWithLocale(ui: ReactElement, locale: TestLocale = 'en'): Promise<RenderResult> {
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      ar: { translation: ar },
    },
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

  if (originalDirection === null) originalDirection = document.documentElement.dir;
  document.documentElement.dir = RTL_LANGS.has(locale) ? 'rtl' : 'ltr';

  return render(<I18nextProvider i18n={instance}>{ui}</I18nextProvider>);
}
