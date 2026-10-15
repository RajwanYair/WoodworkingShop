import { lazy, type ExoticComponent, type ReactNode } from 'react';
import i18n from '../i18n';
import { ensureNamespaces } from '../i18n/load-namespaces';
import type { I18nNamespace } from '../i18n/namespace-catalog';

/** Function component. `never` keeps required props assignable under strict function types. */
type FeatureComponent = (props: never) => ReactNode;

type PropsOf<T> = T extends (props: infer P) => unknown ? P : never;

type ReactLazyLoad = Parameters<typeof lazy>[0];

/** Lazy-load a panel and the translation namespaces it renders. */
export function lazyFeature<T extends FeatureComponent>(
  load: () => Promise<{ default: T }>,
  namespaces: readonly I18nNamespace[],
): ExoticComponent<PropsOf<T>> {
  const loadPanel: ReactLazyLoad = async () => {
    const [loaded] = await Promise.all([load(), ensureNamespaces(i18n.language, namespaces)]);
    return loaded as unknown as Awaited<ReturnType<ReactLazyLoad>>;
  };
  return lazy(loadPanel) as ExoticComponent<PropsOf<T>>;
}
