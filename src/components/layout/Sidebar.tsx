import { useCabinetStore } from '../../store/cabinet-store';

export function Sidebar() {
  const { parts, hardware, optimization } = useCabinetStore();

  return (
    <aside className="w-64 bg-wood-50 dark:bg-wood-900 border-e border-wood-200 dark:border-wood-800 p-4 hidden lg:block overflow-y-auto" role="complementary" aria-label="Cabinet summary">
      <h2 className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide mb-3">
        Summary
      </h2>

      <dl className="space-y-2 text-sm">
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
    </aside>
  );
}
