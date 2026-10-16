import { isMediaQueryMatched } from '../store/platform-boundary';

export function transitionTab(update: () => void): void {
  const prefersReducedMotion = isMediaQueryMatched('(prefers-reduced-motion: reduce)');
  const startViewTransition = Reflect.get(document, 'startViewTransition');

  if (prefersReducedMotion || typeof startViewTransition !== 'function') {
    update();
    return;
  }

  Reflect.apply(startViewTransition, document, [update]);
}
