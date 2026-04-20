import { useState } from 'react';
import { useCabinetStore } from '../../store/cabinet-store';
import { CostEstimatePanel } from '../configurator/CostEstimatePanel';

export function Sidebar() {
  const { parts, hardware, optimization } = useCabinetStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <>
      <h2 className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide mb-3">Summary</h2>

      <dl className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <dt className="text-wood-600 dark:text-wood-300">Parts</dt>
          <dd className="font-medium">{parts.length}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-wood-600 dark:text-wood-300">Hardware items</dt>
          <dd className="font-medium">{hardware.length}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-wood-600 dark:text-wood-300">Sheets needed</dt>
          <dd className="font-medium">{optimization.totalSheets}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-wood-600 dark:text-wood-300">Yield</dt>
          <dd className="font-medium">{optimization.overallYield}%</dd>
        </div>
      </dl>

      <CostEstimatePanel />
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-5 left-5 z-50 bg-wood-600 hover:bg-wood-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-lg transition-colors"
        data-print="hide"
        aria-label="Toggle summary panel"
      >
        📊
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          data-print="hide"
          role="dialog"
          aria-modal="true"
          aria-label="Cabinet summary"
          onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
          tabIndex={-1}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === 'Enter' && setMobileOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <aside
            className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-wood-50 dark:bg-wood-900 border-t border-wood-200 dark:border-wood-800 p-4 rounded-t-xl overflow-y-auto animate-slide-up"
            aria-label="Cabinet summary"
          >
            <div className="w-10 h-1 bg-wood-300 dark:bg-wood-600 rounded-full mx-auto mb-3" />
            {content}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="w-64 bg-wood-50 dark:bg-wood-900 border-e border-wood-200 dark:border-wood-800 p-4 hidden lg:block overflow-y-auto"
        aria-label="Cabinet summary"
        data-print="hide"
      >
        {content}
      </aside>
    </>
  );
}
