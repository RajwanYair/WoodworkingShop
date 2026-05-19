import { useEffect, useRef, useState } from 'react';

interface UseIntersectionVisibleOptions {
  /**
   * Root margin passed to IntersectionObserver (default: '200px 0px').
   * A vertical margin keeps adjacent sheets in the render tree slightly before
   * they scroll into view, avoiding visible pop-in.
   */
  rootMargin?: string;
  /** Once visible, keep the element rendered (default: true). */
  keepMounted?: boolean;
}

/**
 * Returns `true` once the referenced element has entered (or is near) the
 * visible viewport.  Uses `IntersectionObserver` when available, falls back
 * to `true` in environments without it (SSR, test polyfill with no stub).
 *
 * Usage:
 *   const { ref, isVisible } = useIntersectionVisible();
 *   <div ref={ref}>{isVisible ? <ExpensiveContent /> : <Placeholder />}</div>
 */
export function useIntersectionVisible<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionVisibleOptions = {},
): { ref: React.RefObject<T | null>; isVisible: boolean } {
  const { rootMargin = '200px 0px', keepMounted = true } = options;
  const ref = useRef<T>(null);
  // Default to true if IntersectionObserver is unavailable (prevents blank content in tests/SSR)
  const hasIO = typeof IntersectionObserver !== 'undefined';
  const [isVisible, setIsVisible] = useState(!hasIO);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasIO) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (keepMounted) {
            // Once shown, no need to keep observing
            observer.disconnect();
          }
        } else if (!keepMounted) {
          setIsVisible(false);
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, keepMounted, hasIO]);

  return { ref, isVisible };
}
