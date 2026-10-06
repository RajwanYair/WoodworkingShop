import { useEffect, useState, useRef } from 'react';
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
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? true);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);

  useFocusTrap(mobileDialogRef, mobileOpen);

  useEffect(() => {
    if (mobileOpen) mobileDialogRef.current?.showModal();
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = () => setIsDesktop(desktopQuery.matches);
    desktopQuery.addEventListener('change', handleChange);
    return () => desktopQuery.removeEventListener('change', handleChange);
  }, []);

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <img
          src={`${import.meta.env.BASE_URL}woodgrain-spark.svg`}
          alt=""
          aria-hidden="true"
          className="h-4 w-24 opacity-80"
          loading="lazy"
        />
      </div>
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
        className="bg-wood-600 hover:bg-wood-700 fixed inset-s-5 bottom-5 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-colors lg:hidden"
        data-print="hide"
        aria-label="Toggle summary panel"
      >
        <IconBarChart size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <dialog
          ref={mobileDialogRef}
          className="fixed inset-0 z-40 m-0 flex h-full w-full max-w-none flex-col justify-end overflow-hidden border-0 bg-transparent p-0 backdrop:bg-black/40 lg:hidden"
          data-print="hide"
          aria-label="Cabinet summary"
          onCancel={(event) => {
            event.preventDefault();
            setMobileOpen(false);
          }}
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0"
            onClick={() => setMobileOpen(false)}
            aria-label="Close panel"
            tabIndex={-1}
          />
          <aside
            className="bg-wood-50 dark:bg-wood-900 border-wood-200 dark:border-wood-800 animate-slide-up relative z-10 max-h-[70vh] w-full overflow-y-auto rounded-t-xl border-t p-4"
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
        </dialog>
      )}

      {/* Desktop sidebar */}
      <aside
        className="bg-wood-50 dark:bg-wood-900 border-wood-200 dark:border-wood-800 hidden w-64 overflow-y-auto border-e p-4 lg:block"
        aria-label="Cabinet summary"
        data-print="hide"
      >
        {isDesktop && content}
      </aside>
    </>
  );
}
