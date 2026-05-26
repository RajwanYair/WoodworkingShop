import { useState, useRef } from 'react';
import { useCabinetStore } from '../../store/cabinet-store';
import { CostEstimatePanel } from '../configurator/CostEstimatePanel';
import { CostSummaryPanel } from '../configurator/CostSummaryPanel';
import { CostVariancePanel } from '../configurator/CostVariancePanel';
import { ShelfSpacingPresetsPanel } from '../configurator/ShelfSpacingPresetsPanel';
import { SnapshotPanel } from './SnapshotPanel';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconBarChart, IconX } from './Icons';

export function Sidebar() {
  const { parts, hardware, optimization } = useCabinetStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDialogRef = useRef<HTMLElement>(null);

  useFocusTrap(mobileDialogRef, mobileOpen, () => setMobileOpen(false));

  const content = (
    <>
      <h2 className="text-wood-700 dark:text-wood-200 mb-3 text-sm font-semibold tracking-wide uppercase">
        🪵 Summary
      </h2>

      <dl className="mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-wood-600 dark:text-wood-300">🔲 Parts</dt>
          <dd className="font-medium">{parts.length}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-wood-600 dark:text-wood-300">🔩 Hardware items</dt>
          <dd className="font-medium">{hardware.length}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-wood-600 dark:text-wood-300">📋 Sheets needed</dt>
          <dd className="font-medium">{optimization.totalSheets}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-wood-600 dark:text-wood-300">📊 Yield</dt>
          <dd className="font-medium">{optimization.overallYield}%</dd>
        </div>
      </dl>

      <CostEstimatePanel />
      {/* Sprint 95 — exportable cost breakdown */}
      <CostSummaryPanel />
      {/* Sprint 99 — cost variance tracker */}
      <CostVariancePanel />
      {/* Sprint 102 — shelf spacing presets */}
      <ShelfSpacingPresetsPanel />
      <SnapshotPanel />
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="bg-wood-600 hover:bg-wood-700 fixed start-5 bottom-5 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-colors lg:hidden"
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === 'Enter' && setMobileOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <aside
            ref={mobileDialogRef}
            className="bg-wood-50 dark:bg-wood-900 border-wood-200 dark:border-wood-800 animate-slide-up absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-xl border-t p-4"
            aria-label="Cabinet summary"
          >
            <div className="relative">
              <div className="bg-wood-300 dark:bg-wood-600 mx-auto mb-3 h-1 w-10 rounded-full" />
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
        className="bg-wood-50 dark:bg-wood-900 border-wood-200 dark:border-wood-800 hidden w-64 overflow-y-auto border-e p-4 lg:block"
        aria-label="Cabinet summary"
        data-print="hide"
      >
        {content}
      </aside>
    </>
  );
}
