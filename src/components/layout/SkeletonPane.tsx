import { useTranslation } from 'react-i18next';

interface SkeletonLineProps {
  /** Width of the line as a Tailwind fraction class suffix (e.g. "full", "3/4", "1/2"). */
  width?: 'full' | '3/4' | '1/2' | '1/3' | '2/3';
  /** Height class (default: h-4). */
  height?: 'h-3' | 'h-4' | 'h-5' | 'h-6' | 'h-8' | 'h-10' | 'h-12';
}

function SkeletonLine({ width = 'full', height = 'h-4' }: SkeletonLineProps) {
  const widthClass = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '2/3': 'w-2/3',
  }[width];
  return (
    <div
      className={`${widthClass} ${height} rounded bg-wood-200 dark:bg-wood-700 animate-pulse`}
      aria-hidden="true"
    />
  );
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  const widths: SkeletonLineProps['width'][] = ['full', '3/4', '1/2'];
  return (
    <div className="rounded-lg border border-wood-200 dark:border-wood-700 p-4 space-y-3">
      <SkeletonLine height="h-5" width="2/3" />
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

export interface SkeletonPaneProps {
  /** Accessible label for the loading region (for screen-readers). */
  label?: string;
  /** Number of skeleton cards to show (default: 3). */
  cards?: number;
}

/**
 * Animated skeleton placeholder shown while a lazy-loaded panel is loading.
 *
 * Usage (in a React Suspense fallback):
 *   <Suspense fallback={<SkeletonPane label="Loading optimizer…" cards={4} />}>
 *     <OptimizerView />
 *   </Suspense>
 */
export function SkeletonPane({ label, cards = 3 }: SkeletonPaneProps) {
  const { t } = useTranslation();
  const ariaLabel = label ?? t('skeleton.loading');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className="space-y-4 py-4"
      data-testid="skeleton-pane"
    >
      {/* Visually hidden status text for screen readers */}
      <span className="sr-only">{ariaLabel}</span>

      {/* Title bar skeleton */}
      <div className="flex items-center gap-3 mb-6" aria-hidden="true">
        <div className="w-8 h-8 rounded bg-wood-200 dark:bg-wood-700 animate-pulse" />
        <SkeletonLine height="h-6" width="1/3" />
      </div>

      {Array.from({ length: cards }, (_, i) => (
        <SkeletonCard key={i} rows={3} />
      ))}
    </div>
  );
}
