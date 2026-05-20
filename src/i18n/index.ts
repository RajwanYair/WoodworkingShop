import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';
import es from './es.json';
import de from './de.json';
import fr from './fr.json';
import ar from './ar.json';

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

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
    es: { translation: es },
    de: { translation: de },
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
