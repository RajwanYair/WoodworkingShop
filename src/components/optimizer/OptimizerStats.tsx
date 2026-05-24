/** Sprint A3 (Phase 16.5) — extracted from OptimizerView.tsx */

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-wood-50 dark:bg-wood-800 rounded p-3 text-center">
      <div className="text-wood-700 dark:text-wood-200 text-lg font-bold">{value}</div>
      <div className="text-wood-600 dark:text-wood-300 text-xs">{label}</div>
    </div>
  );
}

export function YieldBar({ yieldPercent }: { yieldPercent: number }) {
  // Color: <33 red, <66 amber, else green.
  const color = yieldPercent < 33 ? 'bg-red-500' : yieldPercent < 66 ? 'bg-amber-500' : 'bg-green-500';
  const label = `${yieldPercent}%`;
  return (
    <div
      className="flex shrink-0 items-center gap-2"
      title={`Sheet utilization ${label}`}
      role="meter"
      aria-valuenow={yieldPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Yield ${label}`}
    >
      <div className="bg-wood-200 dark:bg-wood-700 h-2 w-24 overflow-hidden rounded">
        <div className={`${color} h-full transition-all`} style={{ width: `${Math.min(100, yieldPercent)}%` }} />
      </div>
      <span className="text-wood-600 dark:text-wood-300 w-10 text-right font-mono text-xs">{label}</span>
    </div>
  );
}
