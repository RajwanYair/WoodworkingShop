import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { eagerEnglish } from './eager-en';
import { loadMergedEnglish, loadRequestedNamespaces } from './load-namespaces';
import { createPseudoLocale } from './pseudo-locales';
import './resources';

/** All supported UI languages. RTL locales: he, ar. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', rtl: false },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית', rtl: true },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', rtl: false },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', rtl: false },
  { code: 'fr', label: 'French', nativeLabel: 'Français', rtl: false },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
  ...(import.meta.env.MODE === 'e2e'
    ? [
        { code: 'en-XA', label: 'Pseudo English', nativeLabel: 'English (pseudo)', rtl: false },
        { code: 'ar-XB', label: 'Pseudo Arabic', nativeLabel: 'العربية (pseudo)', rtl: true },
      ]
    : []),
] as const;

export type SupportedLang = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** RTL language codes — used to set document.documentElement.dir. */
export const RTL_LANGS = new Set<SupportedLang>(
  SUPPORTED_LANGUAGES.filter((language) => language.rtl).map(({ code }) => code),
);

/**
 * Load a locale on demand and add the namespaces already requested by the shell.
 * Feature panels load their own namespaces when they open. Safe to call more than once.
 */
export async function loadLocale(lang: SupportedLang): Promise<void> {
  if (lang === 'en') return;
  if (lang === 'en-XA' || lang === 'ar-XB') {
    if (i18n.hasResourceBundle(lang, 'translation')) return;
    const english = await loadMergedEnglish();
    i18n.addResourceBundle(lang, 'translation', createPseudoLocale(english, lang), true, true);
    return;
  }
  await loadRequestedNamespaces(lang);
}

// Boot with the English namespaces used by the workspace route. Feature files load with their panels.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: eagerEnglish },
  },
  lng: 'en',
  fallbackLng: 'en',
  returnNull: false,
  interpolation: { escapeValue: false },
});

export default i18n;
