import type { TFunction } from 'i18next';
import {
  IconList,
  IconWrench,
  IconEye,
  IconTag,
  IconSawKerf,
  IconPrint,
  IconSwap,
  IconDxf,
  IconGcode,
  IconGrainVertical,
} from '../layout/Icons';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { generateHardware } from '../../engine/hardware';
import { downloadHardwareCsv } from '../../utils/bom-export';
import { downloadAllSheetsGcode } from '../../utils/gcode-export';
import { Stat } from './OptimizerStats';
import type { Lang, CutSheet } from '../../engine/types';

export type OptimizerToolbarProps = {
  sheets: CutSheet[];
  totalSheets: number;
  overallYield: number;
  totalWaste: number;
  grainConflictCount: number;
  partFilter: string;
  setPartFilter: (v: string) => void;
  showPartNames: boolean;
  setShowPartNames: React.Dispatch<React.SetStateAction<boolean>>;
  showGrainHatch: boolean;
  setShowGrainHatch: React.Dispatch<React.SetStateAction<boolean>>;
  bomExporting: boolean;
  dxfExporting: boolean;
  handleBomExportWorker: () => void;
  handleDxfExportWorker: () => void;
  filePrefix: string;
  lang: Lang;
  setShowBulkReplace: React.Dispatch<React.SetStateAction<boolean>>;
  t: TFunction;
};

export function OptimizerToolbar({
  sheets,
  totalSheets,
  overallYield,
  totalWaste,
  grainConflictCount,
  partFilter,
  setPartFilter,
  showPartNames,
  setShowPartNames,
  showGrainHatch,
  setShowGrainHatch,
  bomExporting,
  dxfExporting,
  handleBomExportWorker,
  handleDxfExportWorker,
  filePrefix,
  lang,
  setShowBulkReplace,
  t,
}: OptimizerToolbarProps) {
  const {
    colorBlindMode,
    toggleColorBlindMode,
    sawKerf,
    setSawKerf,
    config,
    setConfig,
    autoCoNest,
    setAutoCoNest,
    cabinets,
  } = useCabinetStore();

  const cutCount = sheets.reduce((acc, sh) => {
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (const p of sh.parts) {
      if (p.x > 0) xs.add(p.x);
      const x2 = p.x + p.width;
      if (x2 < sh.sheetWidth) xs.add(x2);
      if (p.y > 0) ys.add(p.y);
      const y2 = p.y + p.length;
      if (y2 < sh.sheetLength) ys.add(y2);
    }
    return acc + xs.size + ys.size;
  }, 0);

  const partCount = sheets.reduce((s, sh) => s + sh.parts.length, 0);

  return (
    <div className="space-y-3">
      {/* Summary stats - always render on their own row so controls never overlap */}
      <div
        className={`grid w-full gap-3 sm:gap-4 ${grainConflictCount > 0 ? 'grid-cols-2 lg:grid-cols-6' : 'grid-cols-2 lg:grid-cols-5'}`}
      >
        <Stat label={t('optimizer.sheets')} value={String(totalSheets)} />
        <Stat label={t('optimizer.yield')} value={`${overallYield}%`} />
        <Stat label={t('optimizer.waste')} value={`${(totalWaste / 1_000_000).toFixed(2)} m²`} />
        <Stat label={t('optimizer.totalParts')} value={String(partCount)} />
        <Stat label={t('optimizer.cuts')} value={String(cutCount)} />
        {grainConflictCount > 0 && (
          <div
            className="rounded border border-amber-300 bg-amber-50 p-3 text-center dark:border-amber-700 dark:bg-amber-900/20"
            title={t('optimizer.grainConflictsTitle', { count: grainConflictCount })}
          >
            <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{grainConflictCount}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400">{t('optimizer.grainConflicts')}</div>
          </div>
        )}
      </div>

      {/* Controls row - starts after stats and wraps naturally on smaller widths */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Part filter */}
        <label className="text-wood-600 dark:text-wood-300 flex items-center gap-1.5 text-xs">
          <input
            type="search"
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            placeholder={t('optimizer.filterPartsPlaceholder')}
            aria-label={t('optimizer.filterParts')}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-400 w-32 rounded border bg-white px-2 py-0.5 text-xs focus:ring-1 focus:outline-none"
          />
          {partFilter && (
            <button
              onClick={() => setPartFilter('')}
              aria-label="Clear filter"
              className="text-wood-400 hover:text-wood-600 dark:hover:text-wood-200 transition-colors"
            >
              ×
            </button>
          )}
        </label>

        {/* Saw kerf */}
        <label className="text-wood-600 dark:text-wood-300 flex items-center gap-1.5 text-xs">
          <IconSawKerf size={14} className="shrink-0" />
          {t('optimizer.sawKerf')}
          <input
            type="number"
            min={0}
            max={8}
            step={0.5}
            value={sawKerf}
            onChange={(e) => setSawKerf(Number(e.target.value))}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-400 w-14 rounded border bg-white px-1 py-0.5 text-center text-xs focus:ring-1 focus:outline-none"
            aria-label={t('optimizer.sawKerf')}
          />
          mm
        </label>

        {/* Guillotine cut mode */}
        <label className="text-wood-600 dark:text-wood-300 flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={config.cutMode === 'guillotine'}
            onChange={(e) => setConfig({ cutMode: e.target.checked ? 'guillotine' : 'freeform' })}
            className="accent-wood-600 dark:accent-wood-400 h-3.5 w-3.5"
            aria-label={t('optimizer.guillotineMode')}
          />
          {t('optimizer.guillotineMode')}
        </label>

        {/* Auto co-nest */}
        <label
          className="text-wood-600 dark:text-wood-300 flex cursor-pointer items-center gap-1.5 text-xs"
          title={t('optimizer.autoCoNestDesc')}
        >
          <input
            type="checkbox"
            checked={autoCoNest}
            onChange={(e) => setAutoCoNest(e.target.checked)}
            className="accent-wood-600 dark:accent-wood-400 h-3.5 w-3.5"
            aria-label={t('optimizer.autoCoNest')}
          />
          {t('optimizer.autoCoNest')}
        </label>

        {/* Export + toggle buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDxfExportWorker}
            disabled={dxfExporting}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            title={t('optimizer.exportDxf')}
            aria-busy={dxfExporting}
          >
            {dxfExporting ? (
              <svg
                className="h-3 w-3 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <IconDxf size={14} />
            )}
            DXF
          </button>

          <button
            onClick={() => {
              void downloadAllSheetsGcode(sheets, filePrefix);
              useToastStore.getState().addToast(t('toast.gcodeExported'), 'success');
            }}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors"
            title={t('optimizer.exportGcode')}
            aria-label={t('optimizer.exportGcode')}
          >
            <IconGcode size={14} /> G-code
          </button>

          <button
            onClick={handleBomExportWorker}
            disabled={bomExporting}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-50"
            title={t('optimizer.exportBom')}
            aria-label={t('optimizer.exportBom')}
          >
            <IconList size={14} /> {bomExporting ? '…' : 'BOM'}
          </button>

          <button
            onClick={() => {
              const hwData = cabinets.map((c) => ({ name: c.name, hardware: generateHardware(c.config) }));
              downloadHardwareCsv(hwData, lang, `${filePrefix}-hardware-list.csv`);
              useToastStore.getState().addToast(t('toast.hardwareExported'), 'success');
            }}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors"
            title={t('optimizer.exportHardware')}
            aria-label={t('optimizer.exportHardware')}
          >
            <IconWrench size={14} /> HW
          </button>

          <button
            onClick={toggleColorBlindMode}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
              colorBlindMode
                ? 'border-blue-400 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800'
            }`}
            title="Toggle color-blind safe palette"
            aria-pressed={colorBlindMode}
          >
            <IconEye size={14} /> CB
          </button>

          <button
            onClick={() => setShowPartNames((v) => !v)}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
              showPartNames
                ? 'bg-wood-200 dark:bg-wood-700 border-wood-400 text-wood-700 dark:text-wood-200'
                : 'border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800'
            }`}
            title={t('optimizer.toggleLabels')}
            aria-pressed={showPartNames}
          >
            <IconTag size={14} /> {t('optimizer.labels')}
          </button>

          <button
            onClick={() => setShowGrainHatch((v) => !v)}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
              showGrainHatch
                ? 'bg-wood-200 dark:bg-wood-700 border-wood-400 text-wood-700 dark:text-wood-200'
                : 'border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800'
            }`}
            title={t('optimizer.grainHatch')}
            aria-pressed={showGrainHatch}
          >
            <IconGrainVertical size={14} /> {t('optimizer.grainHatch')}
          </button>

          <button
            onClick={() => window.print()}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors"
            title={t('optimizer.printSheets')}
            aria-label={t('optimizer.printSheets')}
          >
            <IconPrint size={14} /> {t('optimizer.print')}
          </button>

          <button
            onClick={() => setShowBulkReplace(true)}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors"
            title={t('bulkReplace.title', 'Bulk Material Replace')}
            aria-label={t('bulkReplace.title', 'Bulk Material Replace')}
          >
            <IconSwap size={14} /> {t('bulkReplace.short', 'Replace')}
          </button>
        </div>
      </div>
    </div>
  );
}
