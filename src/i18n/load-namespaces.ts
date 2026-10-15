import i18n from 'i18next';
import { isLocaleBundleLang, localeBundles, type NamespaceMap } from './locale-chunks';
import { EAGER_NAMESPACES, I18N_NAMESPACES, type I18nNamespace } from './namespace-catalog';
import { type LocaleNode } from './pseudo-locales';

const loaded = new Map<string, Promise<void>>(
  EAGER_NAMESPACES.map((namespace) => [`en:${namespace}`, Promise.resolve()]),
);
const requested = new Set<I18nNamespace>(EAGER_NAMESPACES);
const localeCache = new Map<string, Promise<NamespaceMap>>();

function bundleHasNamespace(lang: string, namespace: I18nNamespace): boolean {
  const bundle: unknown = i18n.getResourceBundle(lang, 'translation');
  return typeof bundle === 'object' && bundle !== null && namespace in bundle;
}

function loadLocaleMap(lang: string): Promise<NamespaceMap> {
  if (!isLocaleBundleLang(lang)) return Promise.resolve({});
  const existing = localeCache.get(lang);
  if (existing) return existing;
  const pending = localeBundles[lang]()
    .then((mod) => mod.namespaces)
    .catch((error: unknown) => {
      localeCache.delete(lang);
      throw error;
    });
  localeCache.set(lang, pending);
  return pending;
}

async function loadOne(lang: string, namespace: I18nNamespace): Promise<void> {
  const key = `${lang}:${namespace}`;
  const existing = loaded.get(key);
  if (existing) return existing;
  if (bundleHasNamespace(lang, namespace)) return;

  const pending = loadLocaleMap(lang).then((namespaces) => {
    const value = namespaces[namespace];
    if (!value) return;
    i18n.addResourceBundle(lang, 'translation', { [namespace]: value }, true, true);
  });
  loaded.set(key, pending);
  try {
    await pending;
  } catch (error) {
    loaded.delete(key);
    throw error;
  }
}

/** Load feature namespaces for the active language and the English fallback. */
export async function ensureNamespaces(lang: string, namespaces: readonly I18nNamespace[]): Promise<void> {
  for (const namespace of namespaces) requested.add(namespace);
  const languages = lang === 'en' ? ['en'] : [lang, 'en'];
  await Promise.all(languages.flatMap((language) => namespaces.map((namespace) => loadOne(language, namespace))));
}

/** Load every namespace already requested by the shell or an opened feature. */
export async function loadRequestedNamespaces(lang: string): Promise<void> {
  await ensureNamespaces(lang, [...requested]);
}

/** Merge every English namespace. Used only for e2e pseudo locales. */
export async function loadMergedEnglish(): Promise<LocaleNode> {
  const namespaces = await loadLocaleMap('en');
  const entries = I18N_NAMESPACES.flatMap((namespace) => {
    const value = namespaces[namespace];
    return value ? [[namespace, value] as const] : [];
  });
  return Object.fromEntries(entries);
}
