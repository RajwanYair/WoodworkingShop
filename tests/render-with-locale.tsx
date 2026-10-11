import { createInstance } from 'i18next';
import { afterEach } from 'vitest';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import en from '../src/i18n/en.json';
import he from '../src/i18n/he.json';
import ar from '../src/i18n/ar.json';
import { RTL_LANGS } from '../src/i18n';

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
