import type { ReactNode } from 'react';
import { useIntersectionVisible } from '../../hooks/useIntersectionVisible';

interface VirtualSheetWrapperProps {
  /** Approximate height of the sheet card in pixels — used for the placeholder. */
  placeholderHeight?: number;
  /** The actual SheetCard to render once the wrapper is visible. */
  children: ReactNode;
  /** Root margin for the intersection observer (default: "200px 0px"). */
  rootMargin?: string;
  /** Forwarded className to apply to the outer wrapper. */
  className?: string;
}

/**
 * Defers rendering of a cut-sheet card until it is near the visible viewport.
 *
 * For large projects with 10+ sheets, this keeps the initial DOM lightweight
 * and prevents unnecessary SVG layout work for sheets the user hasn't scrolled
 * to yet.
 *
 * - While off-screen: renders a lightweight skeleton placeholder.
 * - Once intersected: renders the real content and stays mounted permanently.
 */
export function VirtualSheetWrapper({
  children,
  placeholderHeight = 420,
  rootMargin = '200px 0px',
  className,
}: VirtualSheetWrapperProps) {
  const { ref, isVisible } = useIntersectionVisible<HTMLDivElement>({ rootMargin });

  return (
    <div ref={ref} className={className} data-testid="virtual-sheet-wrapper">
      {isVisible ? (
        children
      ) : (
        <div
          aria-hidden="true"
          style={{ height: placeholderHeight }}
          className="rounded-lg border border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-800 animate-pulse"
        />
      )}
    </div>
  );
}
