export function transitionTab(update: () => void): void {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const startViewTransition = Reflect.get(document, 'startViewTransition');

  if (prefersReducedMotion || typeof startViewTransition !== 'function') {
    update();
    return;
  }

  Reflect.apply(startViewTransition, document, [update]);
}
