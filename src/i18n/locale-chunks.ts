/** One dynamic import per language. Eager English boot does not use these chunks. */
export const localeBundles = {
  en: () => import('./locale-chunks/en'),
  he: () => import('./locale-chunks/he'),
  ar: () => import('./locale-chunks/ar'),
  de: () => import('./locale-chunks/de'),
  es: () => import('./locale-chunks/es'),
  fr: () => import('./locale-chunks/fr'),
} as const;

export type LocaleBundleLang = keyof typeof localeBundles;

export function isLocaleBundleLang(lang: string): lang is LocaleBundleLang {
  return Object.hasOwn(localeBundles, lang);
}

export type { NamespaceMap } from './locale-chunks/collect';
