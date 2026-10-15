import type { I18nNamespace } from '../namespace-catalog';
import type { LocaleNode } from '../pseudo-locales';

export type NamespaceMap = Partial<Record<I18nNamespace, LocaleNode>>;

/** Turn an eager locale glob into a namespace map. Keys are the JSON filenames. */
export function collectNamespaces(modules: Record<string, LocaleNode>): NamespaceMap {
  const entries = Object.entries(modules).map(([file, value]) => {
    const slash = Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\'));
    const name = file.slice(slash + 1, -'.json'.length);
    return [name, value] as const;
  });
  return Object.fromEntries(entries) as NamespaceMap;
}
