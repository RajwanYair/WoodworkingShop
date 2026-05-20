import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';

/** All supported UI languages. RTL locales: he, ar. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', rtl: false },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית', rtl: true },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', rtl: false },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', rtl: false },
  { code: 'fr', label: 'French', nativeLabel: 'Français', rtl: false },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
] as const;

export type SupportedLang = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** RTL language codes — used to set document.documentElement.dir. */
export const RTL_LANGS = new Set<SupportedLang>(['he', 'ar']);

/**
 * Locale loader map — each entry is a dynamic import that Vite will code-split
 * into a separate chunk, loaded on first language switch (~45 KB saved on boot).
 */
const LOCALE_LOADERS: Partial<Record<SupportedLang, () => Promise<Record<string, unknown>>>> = {
  he: () => import('./he.json').then((m) => m.default as Record<string, unknown>),
  es: () => import('./es.json').then((m) => m.default as Record<string, unknown>),
  de: () => import('./de.json').then((m) => m.default as Record<string, unknown>),
  fr: () => import('./fr.json').then((m) => m.default as Record<string, unknown>),
  ar: () => import('./ar.json').then((m) => m.default as Record<string, unknown>),
};

/**
 * Load a locale on demand and add it to the i18next resource bundle.
 * Safe to call multiple times — skips if already loaded.
 */
export async function loadLocale(lang: SupportedLang): Promise<void> {
  if (lang === 'en' || i18n.hasResourceBundle(lang, 'translation')) return;
  const loader = LOCALE_LOADERS[lang];
  if (!loader) return;
  const translations = await loader();
  i18n.addResourceBundle(lang, 'translation', translations, true, true);
}

// Boot with English only — non-en locales are lazy-loaded on first switch.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
