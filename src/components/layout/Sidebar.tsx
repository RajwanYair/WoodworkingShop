import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { useCabinetStore } from '../../store/cabinet-store';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconBarChart, IconX } from './Icons';

const SidebarDetailPanels = lazy(() =>
  import('./SidebarDetailPanels').then((module) => ({ default: module.SidebarDetailPanels })),
);

export function Sidebar() {
  const { parts, hardware, optimization } = useCabinetStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? true);
  const mobileDialogRef = useRef<HTMLElement>(null);

  useFocusTrap(mobileDialogRef, mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = () => setIsDesktop(desktopQuery.matches);
    desktopQuery.addEventListener('change', handleChange);
    return () => desktopQuery.removeEventListener('change', handleChange);
  }, []);

  const content = (
    <>
      <h2 className="text-wood-800 dark:text-wood-100 mb-3 text-base font-semibold">Summary</h2>

      <dl className="divide-wood-200 dark:divide-wood-800 bg-wood-100/60 dark:bg-wood-800/60 mb-4 divide-y rounded-xl px-3 text-sm">
        <div className="flex justify-between py-2">
          <dt className="text-wood-600 dark:text-wood-300">Parts</dt>
          <dd className="font-medium tabular-nums">{parts.length}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-wood-600 dark:text-wood-300">Hardware items</dt>
          <dd className="font-medium tabular-nums">{hardware.length}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-wood-600 dark:text-wood-300">Sheets needed</dt>
          <dd className="font-medium tabular-nums">{optimization.totalSheets}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-wood-600 dark:text-wood-300">Yield</dt>
          <dd className="font-medium tabular-nums">{optimization.overallYield}%</dd>
        </div>
      </dl>

      <Suspense fallback={null}>
        <SidebarDetailPanels />
      </Suspense>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="bg-accent fixed inset-s-5 bottom-20 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_8px_24px_rgb(0_0_0/0.18)] hover:brightness-110 lg:hidden"
        data-print="hide"
        aria-label="Toggle summary panel"
      >
        <IconBarChart size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          data-print="hide"
          role="dialog"
          aria-modal="true"
          aria-label="Cabinet summary"
          tabIndex={-1}
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === 'Enter' && setMobileOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <aside
            ref={mobileDialogRef}
            className="bg-wood-50 dark:bg-wood-900 animate-slide-up absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgb(0_0_0/0.18)]"
            aria-label="Cabinet summary"
          >
            <div className="relative">
              <div className="bg-wood-300 dark:bg-wood-600 mx-auto mb-3 h-1.5 w-9 rounded-full" />
              <button
                onClick={() => setMobileOpen(false)}
                className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 absolute top-0 right-0 flex items-center"
                aria-label="Close panel"
              >
                <IconX size={16} />
              </button>
            </div>
            {content}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="bg-wood-50 dark:bg-wood-900 border-wood-200 dark:border-wood-800 hidden w-64 overflow-y-auto border-e p-5 lg:block"
        aria-label="Cabinet summary"
        data-print="hide"
      >
        {isDesktop && content}
      </aside>
    </>
  );
}
