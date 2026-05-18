import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Sprint 8 — useFocusTrap
 *
 * Traps keyboard focus within `containerRef` while `active` is true.
 * Handles:
 *  - Tab/Shift+Tab cycling within focusable children
 *  - Escape key calls `onEscape`
 *  - Initial focus on the first focusable child (or the container itself)
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    // Set initial focus on the first focusable child, or the container
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      el.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [active, containerRef, onEscape]);
}
