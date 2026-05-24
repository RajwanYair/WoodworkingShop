import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { getMaterial } from '../../engine/materials';
import { generateParts } from '../../engine/parts';
import { generateHardware } from '../../engine/hardware';
import { downloadAllSheetsDxf } from '../../utils/dxf-export';
import { downloadAllSheetsGcode } from '../../utils/gcode-export';
import { triggerDownload } from '../../utils/download';
import { GcodePreviewModal } from './GcodePreviewModal';
import { downloadHardwareCsv, generateBomCsv } from '../../utils/bom-export';
import { idbLoadOffcuts, idbSaveOffcut, idbDeleteOffcut } from '../../utils/indexed-db-storage';

import { OptimizationNotesPanel } from './OptimizationNotesPanel';
import { VirtualSheetWrapper } from './VirtualSheetWrapper';
import BomWorker from '../../workers/bom-export.worker?worker';
import type { BomWorkerOutput } from '../../workers/bom-export.worker';
import DxfWorker from '../../workers/dxf-export.worker?worker';
import type { DxfWorkerOutput } from '../../workers/dxf-export.worker';
import { BulkReplaceModal } from './BulkReplaceModal';
import {
  IconList,
  IconWrench,
  IconEye,
  IconTag,
  IconWarning,
  IconSawKerf,
  IconChevronDown,
  IconChevronRight,
  IconScissors,
  IconPrint,
  IconSwap,
  IconLightbulb,
  IconDxf,
  IconGcode,
  IconGrainVertical,
} from '../layout/Icons';
import type { Lang, CutSheet, OffcutEntry, DefectZone } from '../../engine/types';
import { Stat } from './OptimizerStats';
import { SheetCard, computeOffcuts } from './SheetCard';
import { OptimizerExplainerPanel } from './OptimizerExplainerPanel';

export function OptimizerView() {
  const { t, i18n } = useTranslation();
  const {
    optimization,
    combinedOptimization,
    optimizationPending,
    cabinets,
    colorBlindMode,
    toggleColorBlindMode,
    sawKerf,
    setSawKerf,
    materialPriceOverrides,
    projectName,
    sheetSizeOverrides,
    setSheetSizeOverride,
    rotationLockedPartIds,
    toggleRotationLock,
    config,
    setConfig,
    offcutCatalog,
    addOffcutEntry,
    removeOffcutEntry,
    defectZones,
    addDefectZone,
    removeDefectZone,
  } = useCabinetStore();
  const lang = i18n.language as Lang;
  // Phase 12 / Sprint 12 — load saved offcut catalog from IDB on first mount.
  useEffect(() => {
    const { setOffcutCatalog } = useCabinetStore.getState();
    idbLoadOffcuts()
      .then(setOffcutCatalog)
      .catch(() => {});
  }, []);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [partFilter, setPartFilter] = useState(''); // Sprint 46 — part search/highlight filter
  const [showPartNames, setShowPartNames] = useState(false); // Sprint 146 — part name labels
  const [showGrainHatch, setShowGrainHatch] = useState(false); // Phase 12 / Sprint 11 — grain direction hatching
  const [bomExporting, setBomExporting] = useState(false); // v3.17.0 worker state
  const [dxfExporting, setDxfExporting] = useState(false); // v3.22.0 DXF worker state
  const [showBulkReplace, setShowBulkReplace] = useState(false); // v3.18.0
  const [gcodePreview, setGcodePreview] = useState<{ filename: string; sheet: CutSheet } | null>(null); // Sprint 8/11
  const workerRef = useRef<Worker | null>(null);
  const dxfWorkerRef = useRef<Worker | null>(null);
  const multiCabinet = cabinets.length > 1;
  const displayOpt = multiCabinet ? combinedOptimization : optimization;

  /** Sanitized project name for use in filenames (Sprint 156) */
  const filePrefix =
    (projectName.trim() || 'cabinet')
      .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'cabinet';

  /** Worker-based BOM CSV export (v3.17.0) */
  const handleBomExportWorker = useCallback(() => {
    if (bomExporting) return;
    setBomExporting(true);
    const bomData = cabinets.map((c) => ({
      name: c.name,
      parts: generateParts(c.config),
      hardware: generateHardware(c.config),
      notes: c.notes,
    }));
    const filename = `${filePrefix}-bill-of-materials.csv`;

    if (typeof Worker !== 'undefined') {
      const worker = new BomWorker();
      workerRef.current = worker;
      worker.onmessage = (e: MessageEvent<BomWorkerOutput>) => {
        if (e.data.type === 'done' && e.data.csv) {
          triggerDownload(e.data.csv, 'text/csv;charset=utf-8', filename);
          useToastStore.getState().addToast(t('toast.bomExported'), 'success');
        } else {
          useToastStore.getState().addToast(t('toast.bomExportError', 'BOM export failed'), 'error');
        }
        setBomExporting(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.onerror = () => {
        // Fall back to synchronous export
        const csv = generateBomCsv(bomData, lang, i18n.language);
        triggerDownload(csv, 'text/csv;charset=utf-8', filename);
        useToastStore.getState().addToast(t('toast.bomExported'), 'success');
        setBomExporting(false);
        workerRef.current = null;
      };
      worker.postMessage({ cabinets: bomData, lang, locale: i18n.language });
    } else {
      // No Worker support — synchronous fallback
      const csv = generateBomCsv(bomData, lang, i18n.language);
      triggerDownload(csv, 'text/csv;charset=utf-8', filename);
      useToastStore.getState().addToast(t('toast.bomExported'), 'success');
      setBomExporting(false);
    }
  }, [bomExporting, cabinets, filePrefix, lang, t, i18n.language]);

  /** Worker-based DXF all-sheets export (v3.22.0) */
  const handleDxfExportWorker = useCallback(() => {
    if (dxfExporting || displayOpt.sheets.length === 0) return;
    setDxfExporting(true);
    const sheets = displayOpt.sheets;
    const filename = `${filePrefix}-cut-sheets-all.dxf`;

    if (typeof Worker !== 'undefined') {
      const worker = new DxfWorker();
      dxfWorkerRef.current = worker;
      worker.onmessage = (e: MessageEvent<DxfWorkerOutput>) => {
        if (e.data.type === 'done' && e.data.dxf) {
          triggerDownload(e.data.dxf, 'application/dxf', e.data.filename ?? filename);
          useToastStore.getState().addToast(t('toast.dxfExported'), 'success');
        } else {
          useToastStore.getState().addToast(t('toast.dxfExportError', 'DXF export failed'), 'error');
        }
        setDxfExporting(false);
        worker.terminate();
        dxfWorkerRef.current = null;
      };
      worker.onerror = () => {
        // Fallback: synchronous export
        void downloadAllSheetsDxf(sheets, filePrefix);
        useToastStore.getState().addToast(t('toast.dxfExported'), 'success');
        setDxfExporting(false);
        dxfWorkerRef.current = null;
      };
      worker.postMessage({ mode: 'all', sheets, projectName: filePrefix });
    } else {
      // No Worker support — synchronous fallback
      void downloadAllSheetsDxf(sheets, filePrefix);
      useToastStore.getState().addToast(t('toast.dxfExported'), 'success');
      setDxfExporting(false);
    }
  }, [dxfExporting, displayOpt.sheets, filePrefix, t]);

  // Sprint A3 part 2: hints — surface low-yield sheets and same-thickness
  // material consolidation opportunities so the user knows to consult the
  // Smart Optimizer below.
  const lowYieldSheet = displayOpt.sheets.find((s) => s.yieldPercent > 0 && s.yieldPercent < 25);
  const materialSwapPair = (() => {
    const byThickness = new Map<number, Set<string>>();
    for (const s of displayOpt.sheets) {
      const set = byThickness.get(s.thickness) ?? new Set<string>();
      set.add(s.material);
      byThickness.set(s.thickness, set);
    }
    for (const [thickness, mats] of byThickness) {
      if (mats.size >= 2) {
        const arr = Array.from(mats);
        return { a: arr[0], b: arr[1], t: thickness };
      }
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      {/* Sprint 11 — sr-only ARIA live region for screen-reader status announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {optimizationPending
          ? t('optimizer.statusPending')
          : displayOpt.sheets.length > 0
            ? t('optimizer.statusComplete', { count: displayOpt.sheets.length })
            : ''}
      </div>
      {/* v3.21.0 — Worker recalculation indicator */}
      {optimizationPending && (
        <div className="text-wood-600 dark:text-wood-300 flex animate-pulse items-center gap-2 text-xs">
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
          {t('optimizer.statusPending')}
        </div>
      )}
      {/* Hints (Sprint A3 part 2) */}
      {(lowYieldSheet || materialSwapPair) && (
        <div className="space-y-2">
          {lowYieldSheet && (
            <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              <IconWarning size={14} className="mt-0.5 shrink-0" />
              {t('optimizer.lowYieldWarning', {
                num: lowYieldSheet.sheetIndex + 1,
                yield: lowYieldSheet.yieldPercent,
              })}
            </div>
          )}
          {materialSwapPair && (
            <div className="flex items-start gap-2 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
              <IconLightbulb size={14} className="mt-0.5 shrink-0" />
              {t('optimizer.materialSwapHint', {
                a: getMaterial(materialSwapPair.a).name[lang],
                b: getMaterial(materialSwapPair.b).name[lang],
                t: materialSwapPair.t,
              })}
            </div>
          )}
        </div>
      )}

      {/* Summary stats + color-blind toggle */}
      <div className="flex items-center justify-between">
        <div className={`grid flex-1 gap-4 ${displayOpt.grainConflictCount > 0 ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <Stat label={t('optimizer.sheets')} value={String(displayOpt.totalSheets)} />
          <Stat label={t('optimizer.yield')} value={`${displayOpt.overallYield}%`} />
          <Stat label={t('optimizer.waste')} value={`${(displayOpt.totalWaste / 1_000_000).toFixed(2)} m²`} />
          <Stat
            label={t('optimizer.totalParts')}
            value={String(displayOpt.sheets.reduce((s, sh) => s + sh.parts.length, 0))}
          />
          <Stat
            label={t('optimizer.cuts')}
            value={String(
              /* Sprint 164 — count unique cut lines per sheet (excluding sheet boundary) */
              displayOpt.sheets.reduce((acc, sh) => {
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
              }, 0),
            )}
          />
          {/* Sprint 41 — grain conflict count stat, only shown when > 0 */}
          {displayOpt.grainConflictCount > 0 && (
            <div
              className="rounded border border-amber-300 bg-amber-50 p-3 text-center dark:border-amber-700 dark:bg-amber-900/20"
              title={t('optimizer.grainConflictsTitle', { count: displayOpt.grainConflictCount })}
            >
              <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                {displayOpt.grainConflictCount}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400">{t('optimizer.grainConflicts')}</div>
            </div>
          )}
        </div>
        {/* Sprint 46 — part search/highlight filter */}
        <label className="text-wood-600 dark:text-wood-300 ms-4 flex items-center gap-1.5 text-xs">
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
        {/* Sprint 136 — saw kerf input */}
        <label className="text-wood-600 dark:text-wood-300 ms-4 flex items-center gap-1.5 text-xs">
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
        {/* Phase 11 / Sprint 5 — guillotine cut mode toggle */}
        <label className="text-wood-600 dark:text-wood-300 ms-4 flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={config.cutMode === 'guillotine'}
            onChange={(e) => setConfig({ cutMode: e.target.checked ? 'guillotine' : 'freeform' })}
            className="accent-wood-600 dark:accent-wood-400 h-3.5 w-3.5"
            aria-label={t('optimizer.guillotineMode')}
          />
          {t('optimizer.guillotineMode')}
        </label>
        <div className="ms-2 flex gap-2">
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
              void downloadAllSheetsGcode(displayOpt.sheets, filePrefix);
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
          {/* Sprint 137 — hardware CSV */}
          <button
            onClick={() => {
              const hwData = cabinets.map((c) => ({
                name: c.name,
                hardware: generateHardware(c.config),
              }));
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
          {/* Sprint 146 — toggle part name labels inside SVG rects */}
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
          {/* Phase 12 / Sprint 11 — grain direction hatch toggle */}
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
          {/* Sprint 151 — print cut sheets */}
          <button
            onClick={() => window.print()}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors"
            title={t('optimizer.printSheets')}
            aria-label={t('optimizer.printSheets')}
          >
            <IconPrint size={14} /> {t('optimizer.print')}
          </button>
          {/* v3.18.0 — bulk material replacement */}
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

      {/* v3.18.0 — Bulk material replacement modal */}
      {showBulkReplace && <BulkReplaceModal onClose={() => setShowBulkReplace(false)} />}

      {/* Sprint 8 — G-code toolpath preview modal */}
      {gcodePreview && (
        <GcodePreviewModal
          sheet={gcodePreview.sheet}
          filename={gcodePreview.filename}
          onClose={() => setGcodePreview(null)}
          onDownload={(gcodeText) => {
            triggerDownload(gcodeText, 'text/plain', gcodePreview.filename);
            useToastStore.getState().addToast(t('toast.gcodeExported'), 'success');
          }}
        />
      )}

      {/* Multi-cabinet label */}
      {multiCabinet && (
        <p className="text-wood-600 dark:text-wood-300 text-xs italic">
          Combined optimization for {cabinets.length} cabinets
        </p>
      )}

      {/* Optimization Notes — auto-running suggestions panel */}
      <OptimizationNotesPanel />

      {/* Sprint 7 — Layout explainer: placement stats */}
      <OptimizerExplainerPanel sheets={displayOpt.sheets} t={t} />

      {/* Individual sheets — data-print-sheets targets print CSS (Sprint 151) */}
      {/* v3.28.0: wide sheets (>1500mm) get landscape page layout in print */}
      <div
        data-print-sheets
        className={
          displayOpt.sheets.some((s) => s.sheetWidth > 1500 || s.sheetLength > 1500) ? 'print-landscape' : undefined
        }
      >
        {displayOpt.sheets.map((sheet) => (
          <VirtualSheetWrapper key={sheet.sheetIndex}>
            <SheetCard
              sheet={sheet}
              lang={lang}
              hoveredPartId={hoveredPartId}
              onHoverPart={setHoveredPartId}
              colorBlindMode={colorBlindMode}
              showPartNames={showPartNames}
              showGrainHatch={showGrainHatch}
              defectZones={defectZones[sheet.material] ?? []}
              filePrefix={filePrefix}
              partFilter={partFilter}
              onGcodePreview={(filename, s) => setGcodePreview({ filename, sheet: s })}
              rotationLockedPartIds={rotationLockedPartIds}
              onToggleRotationLock={toggleRotationLock}
              t={t}
            />
          </VirtualSheetWrapper>
        ))}
        {/* v3.28.0 — print-only footer with stats */}
        <div className="print-only-footer hidden">
          {filePrefix} — {displayOpt.totalSheets} {t('optimizer.sheets').toLowerCase()}, {displayOpt.overallYield}%{' '}
          {t('optimizer.yield').toLowerCase()}
        </div>
      </div>

      {/* Sprint 160 — Material usage summary */}
      <MaterialSummaryPanel
        sheets={displayOpt.sheets}
        materialPriceOverrides={materialPriceOverrides}
        sheetSizeOverrides={sheetSizeOverrides}
        setSheetSizeOverride={setSheetSizeOverride}
        t={t}
        lang={lang}
      />

      {/* Sprint 150 — Shopping list / sheets-needed summary */}
      <ShoppingListPanel sheets={displayOpt.sheets} materialPriceOverrides={materialPriceOverrides} t={t} lang={lang} />

      {/* Sprint 147 — Usable Offcuts panel */}
      <OffcutsPanel
        sheets={displayOpt.sheets}
        offcutCatalog={offcutCatalog}
        onSaveOffcut={(entry) => {
          addOffcutEntry(entry);
          idbSaveOffcut(entry).catch(() => {});
        }}
        onDeleteOffcut={(id) => {
          removeOffcutEntry(id);
          idbDeleteOffcut(id).catch(() => {});
        }}
        t={t}
      />

      {/* Phase 12 / Sprint 13 — Sheet defect zones panel */}
      <DefectZonePanel
        materials={[...new Set(displayOpt.sheets.map((s) => s.material))]}
        defectZones={defectZones}
        onAdd={addDefectZone}
        onRemove={removeDefectZone}
        t={t}
      />

      {/* Part legend */}
      {hoveredPartId && (
        <div className="bg-wood-800 pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded px-3 py-1.5 text-xs text-white shadow-lg">
          {hoveredPartId}
        </div>
      )}
    </div>
  );
}

interface Offcut {
  material: string;
  thickness: number;
  w: number;
  h: number;
  area: number; // mm²
}

function OffcutsPanel({
  sheets,
  offcutCatalog,
  onSaveOffcut,
  onDeleteOffcut,
  t,
}: {
  sheets: CutSheet[];
  offcutCatalog: OffcutEntry[];
  onSaveOffcut: (entry: OffcutEntry) => void;
  onDeleteOffcut: (id: string) => void;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(true);

  const offcuts: Offcut[] = sheets
    .flatMap((sheet) =>
      computeOffcuts(sheet).map((oc) => ({
        material: sheet.material,
        thickness: sheet.thickness,
        w: oc.w,
        h: oc.h,
        area: oc.area,
      })),
    )
    .sort((a, b) => b.area - a.area);

  if (offcuts.length === 0) return null;

  return (
    <div className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 overflow-hidden rounded-xl border bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-wood-800 dark:text-wood-100 hover:bg-wood-50 dark:hover:bg-wood-800 flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <IconScissors size={15} />
          {t('optimizer.offcuts')}
          <span className="text-wood-600 dark:text-wood-300 ml-1 text-xs font-normal">({offcuts.length})</span>
        </span>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-wood-600 dark:text-wood-300 mb-3 text-xs">{t('optimizer.offcutsDesc')}</p>
          <div className="space-y-1.5">
            {offcuts.map((oc, i) => (
              <div
                key={i}
                className="bg-wood-50 dark:bg-wood-800 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-wood-700 dark:text-wood-300 font-medium">
                  {oc.material} {oc.thickness}mm
                </span>
                <span className="text-wood-600 dark:text-wood-300">
                  {Math.round(oc.w)} × {Math.round(oc.h)} mm
                </span>
                <span className="text-wood-400 dark:text-wood-500">{(oc.area / 1_000_000).toFixed(3)} m²</span>
                {/* Phase 12 / Sprint 12 — save to offcut catalog */}
                <button
                  onClick={() =>
                    onSaveOffcut({
                      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                      material: oc.material,
                      thickness: oc.thickness,
                      width: Math.round(oc.w),
                      length: Math.round(oc.h),
                      addedAt: Date.now(),
                    })
                  }
                  className="border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-700 rounded border px-1.5 py-0.5 transition-colors"
                  title={t('optimizer.saveToOffcutCatalog')}
                  aria-label={t('optimizer.saveToOffcutCatalog')}
                >
                  ＋
                </button>
              </div>
            ))}
          </div>
          {/* Phase 12 / Sprint 12 — saved offcut catalog */}
          {offcutCatalog.length > 0 && (
            <div className="mt-4">
              <p className="text-wood-700 dark:text-wood-200 mb-2 text-xs font-semibold">
                {t('optimizer.offcutCatalog')} ({offcutCatalog.length})
              </p>
              <div className="space-y-1">
                {offcutCatalog.map((oc) => (
                  <div
                    key={oc.id}
                    className="border-wood-200 dark:border-wood-700 flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-xs"
                  >
                    <span className="text-wood-600 dark:text-wood-300">
                      {oc.material} {oc.thickness}mm — {oc.width}×{oc.length} mm
                    </span>
                    <button
                      onClick={() => onDeleteOffcut(oc.id)}
                      className="rounded px-1 text-red-500 transition-colors hover:text-red-700 dark:text-red-400"
                      title={t('optimizer.deleteOffcut')}
                      aria-label={t('optimizer.deleteOffcut')}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Sprint 160: Material usage summary — area, sheets, cost per material. */
function MaterialSummaryPanel({
  sheets,
  materialPriceOverrides,
  sheetSizeOverrides,
  setSheetSizeOverride,
  t,
  lang,
}: {
  sheets: CutSheet[];
  materialPriceOverrides: Record<string, number>;
  sheetSizeOverrides: Record<string, { width: number; length: number }>; // Sprint 165
  setSheetSizeOverride: (key: string, size: { width: number; length: number } | null) => void; // Sprint 165
  t: (key: string) => string;
  lang: Lang;
}) {
  const [open, setOpen] = useState(true);
  /** Sprint 165 — which material row is currently being edited */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editW, setEditW] = useState('');
  const [editL, setEditL] = useState('');

  // Group by material + thickness — Sprint 165: include materialKey in row data
  const groups = new Map<
    string,
    {
      materialKey: string;
      name: { en: string; he: string };
      thickness: number;
      sheetArea: number;
      qty: number;
      pricePerSheet: number;
      defaultW: number;
      defaultL: number;
    }
  >();
  for (const sheet of sheets) {
    const mat = getMaterial(sheet.material);
    const key = `${sheet.material}-${sheet.thickness}`;
    if (!groups.has(key)) {
      const pricePerSheet = materialPriceOverrides[sheet.material] ?? mat.pricePerSheet ?? 0;
      groups.set(key, {
        materialKey: sheet.material,
        name: mat.name,
        thickness: sheet.thickness,
        sheetArea: (sheet.sheetWidth * sheet.sheetLength) / 1e6, // m²
        qty: 0,
        pricePerSheet,
        defaultW: mat.sheetWidth,
        defaultL: mat.sheetLength,
      });
    }
    groups.get(key)!.qty += 1;
  }

  const rows = [...groups.values()];
  if (rows.length === 0) return null;

  const startEdit = (key: string, defaultW: number, defaultL: number) => {
    const ov = sheetSizeOverrides[key];
    setEditW(String(ov?.width ?? defaultW));
    setEditL(String(ov?.length ?? defaultL));
    setEditingKey(key);
  };
  const commitEdit = (key: string) => {
    const w = parseFloat(editW);
    const l = parseFloat(editL);
    if (w > 0 && l > 0) setSheetSizeOverride(key, { width: w, length: l });
    setEditingKey(null);
  };

  return (
    <div className="border-wood-200 dark:border-wood-700 overflow-hidden rounded-lg border print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-wood-50 dark:bg-wood-800 hover:bg-wood-100 dark:hover:bg-wood-750 text-wood-700 dark:text-wood-200 flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
      >
        {t('optimizer.materialSummary')}
        <span className="text-wood-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="overflow-x-auto px-4 pt-2 pb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-wood-400 dark:text-wood-500 text-left">
                <th className="py-1 pr-4 font-medium">{t('optimizer.materialSummaryMaterial')}</th>
                <th className="py-1 pr-4 text-right font-medium">{t('optimizer.materialSummarySheets')}</th>
                <th className="py-1 pr-4 text-right font-medium">{t('optimizer.materialSummaryArea')}</th>
                <th className="py-1 pr-4 text-right font-medium">{t('optimizer.materialSummaryCost')}</th>
                <th className="py-1 text-right font-medium">{t('optimizer.sheetSize')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const totalArea = (row.sheetArea * row.qty).toFixed(2);
                const totalCost = row.pricePerSheet > 0 ? (row.pricePerSheet * row.qty).toFixed(0) : null;
                const hasOverride = !!sheetSizeOverrides[row.materialKey];
                const isEditing = editingKey === row.materialKey;
                return (
                  <tr key={i} className="border-wood-100 dark:border-wood-800 border-t">
                    <td className="text-wood-700 dark:text-wood-300 py-1.5 pr-4 font-medium">
                      {row.name[lang]} {row.thickness} mm
                    </td>
                    <td className="text-wood-600 dark:text-wood-300 py-1.5 pr-4 text-right">×{row.qty}</td>
                    <td className="text-wood-600 dark:text-wood-300 py-1.5 pr-4 text-right">{totalArea} m²</td>
                    <td className="text-wood-700 dark:text-wood-200 py-1.5 pr-4 text-right font-semibold">
                      {totalCost ? `₪${totalCost}` : '—'}
                    </td>
                    {/* Sprint 165 — inline sheet size override editor */}
                    <td className="py-1.5 text-right">
                      {isEditing ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={100}
                            max={5000}
                            step={10}
                            value={editW}
                            onChange={(e) => setEditW(e.target.value)}
                            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-400 w-16 rounded border bg-white px-1 py-0.5 text-center text-xs focus:ring-1 focus:outline-none"
                            aria-label="Sheet width mm"
                          />
                          <span className="text-wood-400">×</span>
                          <input
                            type="number"
                            min={100}
                            max={5000}
                            step={10}
                            value={editL}
                            onChange={(e) => setEditL(e.target.value)}
                            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-wood-400 w-16 rounded border bg-white px-1 py-0.5 text-center text-xs focus:ring-1 focus:outline-none"
                            aria-label="Sheet length mm"
                          />
                          <button
                            type="button"
                            onClick={() => commitEdit(row.materialKey)}
                            className="px-1 text-xs text-green-600 hover:underline dark:text-green-400"
                            title="Apply"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="text-wood-400 hover:text-wood-600 px-1 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`font-mono ${hasOverride ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-wood-400 dark:text-wood-500'}`}
                          >
                            {hasOverride
                              ? `${sheetSizeOverrides[row.materialKey].width}×${sheetSizeOverrides[row.materialKey].length}`
                              : `${row.defaultW}×${row.defaultL}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEdit(row.materialKey, row.defaultW, row.defaultL)}
                            className="text-wood-400 hover:text-wood-600 dark:hover:text-wood-300 text-xs"
                            title={t('optimizer.sheetSizeEdit')}
                          >
                            ✎
                          </button>
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => setSheetSizeOverride(row.materialKey, null)}
                              className="text-xs text-red-400 hover:text-red-600"
                              title={t('optimizer.sheetSizeReset')}
                            >
                              ↺
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Phase 12 / Sprint 13 — per-material defect zone manager panel. */
function DefectZonePanel({
  materials,
  defectZones,
  onAdd,
  onRemove,
  t,
}: {
  materials: string[];
  defectZones: Record<string, DefectZone[]>;
  onAdd: (materialKey: string, zone: DefectZone) => void;
  onRemove: (materialKey: string, zoneIndex: number) => void;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [editMat, setEditMat] = useState('');
  const [form, setForm] = useState({ x: 0, y: 0, width: 100, length: 100 });

  const allZones = materials.flatMap((m) => (defectZones[m] ?? []).map((z, i) => ({ ...z, material: m, idx: i })));

  if (materials.length === 0) return null;

  const handleAdd = () => {
    if (!editMat || form.width <= 0 || form.length <= 0) return;
    onAdd(editMat, { x: form.x, y: form.y, width: form.width, length: form.length });
    setForm({ x: 0, y: 0, width: 100, length: 100 });
  };

  return (
    <div className="border-wood-200 dark:border-wood-700 mt-4 rounded-lg border bg-white dark:bg-neutral-900">
      <button
        type="button"
        className="text-wood-700 dark:text-wood-200 flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <IconWarning size={14} />
        {t('optimizer.defectZones')}
        <span className="bg-wood-100 dark:bg-wood-800 text-wood-500 ms-1 rounded px-1.5 text-[10px]">
          {allZones.length}
        </span>
        <span className="ms-auto">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-wood-100 dark:border-wood-800 border-t px-4 pt-3 pb-4">
          {/* Add zone form */}
          <div className="mb-3 flex flex-wrap items-end gap-2 text-xs">
            <label className="flex flex-col gap-0.5">
              <span className="text-wood-500">{t('optimizer.defectMaterial')}</span>
              <select
                value={editMat}
                onChange={(e) => setEditMat(e.target.value)}
                className="border-wood-300 dark:border-wood-600 rounded border bg-white px-1.5 py-1 text-xs dark:bg-neutral-800"
              >
                <option value="">—</option>
                {materials.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            {(['x', 'y', 'width', 'length'] as const).map((field) => (
              <label key={field} className="flex flex-col gap-0.5">
                <span className="text-wood-500">{field} (mm)</span>
                <input
                  type="number"
                  min={field === 'width' || field === 'length' ? 1 : 0}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                  className="border-wood-300 dark:border-wood-600 w-16 rounded border bg-white px-1.5 py-1 text-xs dark:bg-neutral-800"
                />
              </label>
            ))}
            <button
              type="button"
              onClick={handleAdd}
              disabled={!editMat || form.width <= 0 || form.length <= 0}
              className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              {t('optimizer.defectAdd')}
            </button>
          </div>
          {/* Existing zones */}
          {allZones.length === 0 ? (
            <p className="text-wood-400 text-xs italic">{t('optimizer.defectNone')}</p>
          ) : (
            <ul className="space-y-1">
              {allZones.map((z, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-wood-500 font-medium">{z.material}</span>
                  <span className="text-wood-600 dark:text-wood-300">
                    x={z.x} y={z.y} {z.width}×{z.length} mm
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(z.material, z.idx)}
                    className="ms-auto text-[10px] text-red-400 hover:text-red-600"
                    title={t('optimizer.defectRemove')}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Sprint 150: Group sheets by material+thickness and show shopping list. */
function ShoppingListPanel({
  sheets,
  materialPriceOverrides,
  t,
  lang,
}: {
  sheets: CutSheet[];
  materialPriceOverrides: Record<string, number>;
  t: (k: string) => string;
  lang: Lang;
}) {
  const [open, setOpen] = useState(true);

  if (sheets.length === 0) return null;

  // Group by material+thickness
  const groups = new Map<
    string,
    { material: string; thickness: number; name: { en: string; he: string }; qty: number; pricePerSheet: number }
  >();
  for (const sheet of sheets) {
    const key = `${sheet.material}-${sheet.thickness}`;
    if (!groups.has(key)) {
      const mat = getMaterial(sheet.material);
      const price = materialPriceOverrides[sheet.material] ?? mat.pricePerSheet ?? 0;
      groups.set(key, {
        material: sheet.material,
        thickness: sheet.thickness,
        name: mat.name,
        qty: 0,
        pricePerSheet: price,
      });
    }
    groups.get(key)!.qty++;
  }

  const rows = Array.from(groups.values()).sort((a, b) => b.qty - a.qty);
  const totalSheets = rows.reduce((s, r) => s + r.qty, 0);
  const totalCost = rows.reduce((s, r) => s + r.qty * r.pricePerSheet, 0);

  return (
    <div className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 overflow-hidden rounded-xl border bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-wood-800 dark:text-wood-100 hover:bg-wood-50 dark:hover:bg-wood-800 flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <IconList size={15} />
          {t('optimizer.shoppingList')}
          <span className="text-wood-600 dark:text-wood-300 ml-1 text-xs font-normal">
            {totalSheets} {t('optimizer.sheets').toLowerCase()} · ₪{totalCost.toFixed(0)}
          </span>
        </span>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-wood-600 dark:text-wood-300 mb-3 text-xs">{t('optimizer.shoppingListDesc')}</p>
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div
                key={`${row.material}-${row.thickness}`}
                className="bg-wood-50 dark:bg-wood-800 flex items-center justify-between rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-wood-700 dark:text-wood-300 flex-1 font-medium">
                  {row.name[lang]} {row.thickness} mm
                </span>
                <span className="text-wood-600 dark:text-wood-300 mx-3">×{row.qty}</span>
                <span className="text-wood-700 dark:text-wood-200 font-semibold">
                  {row.pricePerSheet > 0 ? `₪${(row.qty * row.pricePerSheet).toFixed(0)}` : '—'}
                </span>
              </div>
            ))}
          </div>
          {totalCost > 0 && (
            <div className="text-wood-800 dark:text-wood-100 mt-2 flex justify-end text-xs font-bold">
              {t('cost.total')}: ₪{totalCost.toFixed(0)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
