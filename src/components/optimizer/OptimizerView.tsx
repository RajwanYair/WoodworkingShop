import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { getMaterial } from '../../engine/materials';
import { generateParts } from '../../engine/parts';
import { generateHardware } from '../../engine/hardware';
import { downloadDxfForSheet, downloadAllSheetsDxf } from '../../utils/dxf-export';
import { downloadGcodeForSheet, downloadAllSheetsGcode } from '../../utils/gcode-export';
import { downloadHardwareCsv, generateBomCsv } from '../../utils/bom-export';
import { triggerDownload } from '../../utils/download';
import { OptimizationNotesPanel } from './OptimizationNotesPanel';
import BomWorker from '../../workers/bom-export.worker?worker';
import type { BomWorkerOutput } from '../../workers/bom-export.worker';
import DxfWorker from '../../workers/dxf-export.worker?worker';
import type { DxfWorkerOutput } from '../../workers/dxf-export.worker';
import { BulkReplaceModal } from './BulkReplaceModal';
import {
  IconDxf,
  IconGcode,
  IconList,
  IconWrench,
  IconEye,
  IconTag,
  IconWarning,
  IconLightbulb,
  IconGrainVertical,
  IconSawKerf,
  IconChevronDown,
  IconChevronRight,
  IconScissors,
  IconPrint,
  IconSwap,
} from '../layout/Icons';
import type { Lang, CutSheet, CutRect } from '../../engine/types';

/** Scale factor: mm → SVG px */
const S = 0.12;

/** Deuteranopia-safe palette (Wong 2011) — distinguishable without red/green */
const CB_PALETTE = ['#0072B2', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#CC79A7', '#D55E00', '#999999'];

function cbColor(index: number) {
  return CB_PALETTE[index % CB_PALETTE.length];
}

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
  } = useCabinetStore();
  const lang = i18n.language as Lang;
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [showPartNames, setShowPartNames] = useState(false); // Sprint 146 — part name labels
  const [bomExporting, setBomExporting] = useState(false); // v3.17.0 worker state
  const [dxfExporting, setDxfExporting] = useState(false); // v3.22.0 DXF worker state
  const [showBulkReplace, setShowBulkReplace] = useState(false); // v3.18.0
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
        const csv = generateBomCsv(bomData, lang);
        triggerDownload(csv, 'text/csv;charset=utf-8', filename);
        useToastStore.getState().addToast(t('toast.bomExported'), 'success');
        setBomExporting(false);
        workerRef.current = null;
      };
      worker.postMessage({ cabinets: bomData, lang });
    } else {
      // No Worker support — synchronous fallback
      const csv = generateBomCsv(bomData, lang);
      triggerDownload(csv, 'text/csv;charset=utf-8', filename);
      useToastStore.getState().addToast(t('toast.bomExported'), 'success');
      setBomExporting(false);
    }
  }, [bomExporting, cabinets, filePrefix, lang, t]);

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
        downloadAllSheetsDxf(sheets, filePrefix);
        useToastStore.getState().addToast(t('toast.dxfExported'), 'success');
        setDxfExporting(false);
        dxfWorkerRef.current = null;
      };
      worker.postMessage({ mode: 'all', sheets, projectName: filePrefix });
    } else {
      // No Worker support — synchronous fallback
      downloadAllSheetsDxf(sheets, filePrefix);
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
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {optimizationPending
          ? t('optimizer.statusPending')
          : displayOpt.sheets.length > 0
            ? t('optimizer.statusComplete', { count: displayOpt.sheets.length })
            : ''}
      </div>
      {/* v3.21.0 — Worker recalculation indicator */}
      {optimizationPending && (
        <div className="flex items-center gap-2 text-xs text-wood-600 dark:text-wood-300 animate-pulse">
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
            <div className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <IconWarning size={14} className="shrink-0 mt-0.5" />
              {t('optimizer.lowYieldWarning', {
                num: lowYieldSheet.sheetIndex + 1,
                yield: lowYieldSheet.yieldPercent,
              })}
            </div>
          )}
          {materialSwapPair && (
            <div className="rounded border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
              <IconLightbulb size={14} className="shrink-0 mt-0.5" />
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
        <div className="grid grid-cols-5 gap-4 flex-1">
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
        </div>
        {/* Sprint 136 — saw kerf input */}
        <label className="ms-4 flex items-center gap-1.5 text-xs text-wood-600 dark:text-wood-300">
          <IconSawKerf size={14} className="shrink-0" />
          {t('optimizer.sawKerf')}
          <input
            type="number"
            min={0}
            max={8}
            step={0.5}
            value={sawKerf}
            onChange={(e) => setSawKerf(Number(e.target.value))}
            className="w-14 rounded border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-800 px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-wood-400"
            aria-label={t('optimizer.sawKerf')}
          />
          mm
        </label>
        <div className="ms-2 flex gap-2">
          <button
            onClick={handleDxfExportWorker}
            disabled={dxfExporting}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
              downloadAllSheetsGcode(displayOpt.sheets, filePrefix);
              useToastStore.getState().addToast(t('toast.gcodeExported'), 'success');
            }}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors flex items-center gap-1.5"
            title={t('optimizer.exportGcode')}
            aria-label={t('optimizer.exportGcode')}
          >
            <IconGcode size={14} /> G-code
          </button>
          <button
            onClick={handleBomExportWorker}
            disabled={bomExporting}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 disabled:opacity-50 disabled:cursor-wait transition-colors flex items-center gap-1.5"
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
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors flex items-center gap-1.5"
            title={t('optimizer.exportHardware')}
            aria-label={t('optimizer.exportHardware')}
          >
            <IconWrench size={14} /> HW
          </button>
          <button
            onClick={toggleColorBlindMode}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              colorBlindMode
                ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 text-blue-700 dark:text-blue-200'
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
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showPartNames
                ? 'bg-wood-200 dark:bg-wood-700 border-wood-400 text-wood-700 dark:text-wood-200'
                : 'border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800'
            }`}
            title={t('optimizer.toggleLabels')}
            aria-pressed={showPartNames}
          >
            <IconTag size={14} /> {t('optimizer.labels')}
          </button>
          {/* Sprint 151 — print cut sheets */}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors flex items-center gap-1.5"
            title={t('optimizer.printSheets')}
            aria-label={t('optimizer.printSheets')}
          >
            <IconPrint size={14} /> {t('optimizer.print')}
          </button>
          {/* v3.18.0 — bulk material replacement */}
          <button
            onClick={() => setShowBulkReplace(true)}
            className="px-3 py-1.5 rounded text-xs font-medium border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors flex items-center gap-1.5"
            title={t('bulkReplace.title', 'Bulk Material Replace')}
            aria-label={t('bulkReplace.title', 'Bulk Material Replace')}
          >
            <IconSwap size={14} /> {t('bulkReplace.short', 'Replace')}
          </button>
        </div>
      </div>

      {/* v3.18.0 — Bulk material replacement modal */}
      {showBulkReplace && <BulkReplaceModal onClose={() => setShowBulkReplace(false)} />}

      {/* Multi-cabinet label */}
      {multiCabinet && (
        <p className="text-xs text-wood-600 dark:text-wood-300 italic">
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
          <SheetCard
            key={sheet.sheetIndex}
            sheet={sheet}
            lang={lang}
            hoveredPartId={hoveredPartId}
            onHoverPart={setHoveredPartId}
            colorBlindMode={colorBlindMode}
            showPartNames={showPartNames}
            filePrefix={filePrefix}
            t={t}
          />
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
      <OffcutsPanel sheets={displayOpt.sheets} t={t} />

      {/* Part legend */}
      {hoveredPartId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-wood-800 text-white text-xs px-3 py-1.5 rounded shadow-lg z-50 pointer-events-none">
          {hoveredPartId}
        </div>
      )}
    </div>
  );
}

/** Sprint 147: compute usable free strips per sheet.
 *  Strategy: find the largest axis-aligned free rectangle by checking
 *  the right-side strip (after maxX of all parts) and bottom strip (after maxY).
 *  Only strips ≥ 100 mm in both dimensions are reported. */
function computeOffcuts(sheet: CutSheet): { w: number; h: number; area: number }[] {
  const MIN = 100; // mm
  if (sheet.parts.length === 0) {
    // Entirely empty sheet
    if (sheet.sheetWidth >= MIN && sheet.sheetLength >= MIN) {
      return [{ w: sheet.sheetWidth, h: sheet.sheetLength, area: sheet.sheetWidth * sheet.sheetLength }];
    }
    return [];
  }
  const offcuts: { w: number; h: number; area: number }[] = [];
  const maxX = Math.max(...sheet.parts.map((p) => p.x + p.width));
  const maxY = Math.max(...sheet.parts.map((p) => p.y + p.length));
  // Right strip: from maxX to sheetWidth, full height
  const rightW = sheet.sheetWidth - maxX;
  if (rightW >= MIN && sheet.sheetLength >= MIN) {
    offcuts.push({ w: rightW, h: sheet.sheetLength, area: rightW * sheet.sheetLength });
  }
  // Bottom strip: full width, from maxY to sheetLength
  const bottomH = sheet.sheetLength - maxY;
  if (sheet.sheetWidth >= MIN && bottomH >= MIN) {
    offcuts.push({ w: sheet.sheetWidth, h: bottomH, area: sheet.sheetWidth * bottomH });
  }
  return offcuts;
}

interface Offcut {
  material: string;
  thickness: number;
  w: number;
  h: number;
  area: number; // mm²
}

function OffcutsPanel({ sheets, t }: { sheets: CutSheet[]; t: (k: string) => string }) {
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
    <div className="rounded-xl border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-wood-800 dark:text-wood-100 hover:bg-wood-50 dark:hover:bg-wood-800 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <IconScissors size={15} />
          {t('optimizer.offcuts')}
          <span className="ml-1 text-xs font-normal text-wood-600 dark:text-wood-300">({offcuts.length})</span>
        </span>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-wood-600 dark:text-wood-300 mb-3">{t('optimizer.offcutsDesc')}</p>
          <div className="space-y-1.5">
            {offcuts.map((oc, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs rounded-lg bg-wood-50 dark:bg-wood-800 px-3 py-2"
              >
                <span className="font-medium text-wood-700 dark:text-wood-300">
                  {oc.material} {oc.thickness}mm
                </span>
                <span className="text-wood-600 dark:text-wood-300">
                  {Math.round(oc.w)} × {Math.round(oc.h)} mm
                </span>
                <span className="text-wood-400 dark:text-wood-500">{(oc.area / 1_000_000).toFixed(3)} m²</span>
              </div>
            ))}
          </div>
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
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg overflow-hidden print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-wood-50 dark:bg-wood-800 hover:bg-wood-100 dark:hover:bg-wood-750 transition-colors text-sm font-semibold text-wood-700 dark:text-wood-200"
      >
        {t('optimizer.materialSummary')}
        <span className="text-wood-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-wood-400 dark:text-wood-500 text-left">
                <th className="py-1 pr-4 font-medium">{t('optimizer.materialSummaryMaterial')}</th>
                <th className="py-1 pr-4 font-medium text-right">{t('optimizer.materialSummarySheets')}</th>
                <th className="py-1 pr-4 font-medium text-right">{t('optimizer.materialSummaryArea')}</th>
                <th className="py-1 pr-4 font-medium text-right">{t('optimizer.materialSummaryCost')}</th>
                <th className="py-1 font-medium text-right">{t('optimizer.sheetSize')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const totalArea = (row.sheetArea * row.qty).toFixed(2);
                const totalCost = row.pricePerSheet > 0 ? (row.pricePerSheet * row.qty).toFixed(0) : null;
                const hasOverride = !!sheetSizeOverrides[row.materialKey];
                const isEditing = editingKey === row.materialKey;
                return (
                  <tr key={i} className="border-t border-wood-100 dark:border-wood-800">
                    <td className="py-1.5 pr-4 text-wood-700 dark:text-wood-300 font-medium">
                      {row.name[lang]} {row.thickness} mm
                    </td>
                    <td className="py-1.5 pr-4 text-right text-wood-600 dark:text-wood-300">×{row.qty}</td>
                    <td className="py-1.5 pr-4 text-right text-wood-600 dark:text-wood-300">{totalArea} m²</td>
                    <td className="py-1.5 pr-4 text-right font-semibold text-wood-700 dark:text-wood-200">
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
                            className="w-16 rounded border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-800 px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-wood-400"
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
                            className="w-16 rounded border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-800 px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-wood-400"
                            aria-label="Sheet length mm"
                          />
                          <button
                            type="button"
                            onClick={() => commitEdit(row.materialKey)}
                            className="text-green-600 dark:text-green-400 hover:underline text-xs px-1"
                            title="Apply"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="text-wood-400 hover:text-wood-600 text-xs px-1"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`font-mono ${hasOverride ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-wood-400 dark:text-wood-500'}`}
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
                              className="text-red-400 hover:text-red-600 text-xs"
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
    <div className="rounded-xl border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-wood-800 dark:text-wood-100 hover:bg-wood-50 dark:hover:bg-wood-800 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <IconList size={15} />
          {t('optimizer.shoppingList')}
          <span className="ml-1 text-xs font-normal text-wood-600 dark:text-wood-300">
            {totalSheets} {t('optimizer.sheets').toLowerCase()} · ₪{totalCost.toFixed(0)}
          </span>
        </span>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-wood-600 dark:text-wood-300 mb-3">{t('optimizer.shoppingListDesc')}</p>
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div
                key={`${row.material}-${row.thickness}`}
                className="flex items-center justify-between text-xs rounded-lg bg-wood-50 dark:bg-wood-800 px-3 py-2"
              >
                <span className="font-medium text-wood-700 dark:text-wood-300 flex-1">
                  {row.name[lang]} {row.thickness} mm
                </span>
                <span className="text-wood-600 dark:text-wood-300 mx-3">×{row.qty}</span>
                <span className="font-semibold text-wood-700 dark:text-wood-200">
                  {row.pricePerSheet > 0 ? `₪${(row.qty * row.pricePerSheet).toFixed(0)}` : '—'}
                </span>
              </div>
            ))}
          </div>
          {totalCost > 0 && (
            <div className="flex justify-end mt-2 text-xs font-bold text-wood-800 dark:text-wood-100">
              {t('cost.total')}: ₪{totalCost.toFixed(0)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SheetCard({
  sheet,
  lang,
  hoveredPartId,
  onHoverPart,
  colorBlindMode,
  showPartNames,
  filePrefix,
  t,
}: {
  sheet: CutSheet;
  lang: Lang;
  hoveredPartId: string | null;
  onHoverPart: (id: string | null) => void;
  colorBlindMode: boolean;
  showPartNames: boolean;
  filePrefix: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const mat = getMaterial(sheet.material);
  const sw = sheet.sheetWidth * S;
  const sl = sheet.sheetLength * S;

  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded p-4">
      <div className="flex items-center justify-between mb-2 gap-3">
        <h3 className="text-sm font-medium text-wood-600 dark:text-wood-300 flex-1 min-w-0 truncate">
          {t('optimizer.sheet')} #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm)
          {mat.hasGrain && (
            <span
              className="ml-1.5 text-[10px] font-normal text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-1 rounded inline-flex items-center gap-0.5"
              title="Grain direction preserved — parts were not rotated 90°"
            >
              <IconGrainVertical size={10} className="inline" /> grain
            </span>
          )}
        </h3>
        <YieldBar yieldPercent={sheet.yieldPercent} />
        {mat.pricePerSheet != null && (
          <span
            className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-1.5 py-0.5 rounded whitespace-nowrap"
            title={t('optimizer.sheetWasteCostTitle')}
          >
            {t('optimizer.sheetWasteCost', {
              cost: (mat.pricePerSheet * (1 - sheet.yieldPercent / 100)).toFixed(2),
            })}
          </span>
        )}
        <button
          onClick={() => {
            downloadDxfForSheet(sheet, `${filePrefix}-sheet-${sheet.sheetIndex + 1}.dxf`);
            useToastStore.getState().addToast(t('toast.dxfExported'), 'success');
          }}
          className="text-[10px] px-2 py-0.5 rounded border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors flex items-center gap-1"
          title={`Download DXF for sheet ${sheet.sheetIndex + 1}`}
        >
          <IconDxf size={11} /> DXF
        </button>
        <button
          onClick={() => {
            downloadGcodeForSheet(sheet, `${filePrefix}-sheet-${sheet.sheetIndex + 1}.nc`);
            useToastStore.getState().addToast(t('toast.gcodeExported'), 'success');
          }}
          className="text-[10px] px-2 py-0.5 rounded border border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors flex items-center gap-1"
          title={`Download G-code for sheet ${sheet.sheetIndex + 1}`}
          aria-label={`Download G-code for sheet ${sheet.sheetIndex + 1}`}
        >
          <IconGcode size={11} /> G-code
        </button>
      </div>
      <svg
        viewBox={`-18 -18 ${sw + 36} ${sl + 36}`}
        className="w-full max-w-lg border border-wood-100 dark:border-wood-800 rounded bg-white dark:bg-wood-800"
        style={{ maxHeight: 380 }}
        role="img"
        aria-label={`Cut sheet ${sheet.sheetIndex + 1}`}
      >
        {/* ── Defs ── */}
        <defs>
          <pattern
            id={`waste-${sheet.sheetIndex}`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#C8B89A" strokeWidth="0.6" />
          </pattern>
          {/* Drop shadow filter for part rects */}
          <filter id={`shadow-${sheet.sheetIndex}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.8" floodColor="#0003" />
          </filter>
        </defs>

        {/* Sheet background (waste = visible background) */}
        <rect x={0} y={0} width={sw} height={sl} fill="#EDE4D2" stroke="#999" strokeWidth={1} rx={1} />
        <rect x={0} y={0} width={sw} height={sl} fill={`url(#waste-${sheet.sheetIndex})`} />

        {/* ── Ruler ticks — top edge (every 100 mm) ── */}
        {Array.from({ length: Math.floor(sheet.sheetWidth / 100) + 1 }).map((_, ti) => {
          const tx = ti * 100 * S;
          const isMajor = ti % 5 === 0;
          return (
            <g key={`tx-${ti}`}>
              <line x1={tx} y1={-2} x2={tx} y2={isMajor ? -8 : -5} stroke="#888" strokeWidth={0.5} />
              {isMajor && (
                <text x={tx} y={-10} textAnchor="middle" fontSize={4} fill="#888">
                  {ti * 100}
                </text>
              )}
            </g>
          );
        })}
        {/* ── Ruler ticks — left edge (every 100 mm) ── */}
        {Array.from({ length: Math.floor(sheet.sheetLength / 100) + 1 }).map((_, ti) => {
          const ty = ti * 100 * S;
          const isMajor = ti % 5 === 0;
          return (
            <g key={`ty-${ti}`}>
              <line x1={-2} y1={ty} x2={isMajor ? -8 : -5} y2={ty} stroke="#888" strokeWidth={0.5} />
              {isMajor && (
                <text x={-10} y={ty + 1.5} textAnchor="end" fontSize={4} fill="#888">
                  {ti * 100}
                </text>
              )}
            </g>
          );
        })}
        {/* Sheet dimension labels */}
        <text x={sw / 2} y={-12} textAnchor="middle" fontSize={5} fill="#666" fontWeight="500">
          {sheet.sheetWidth} mm
        </text>
        <text
          x={-14}
          y={sl / 2}
          textAnchor="middle"
          fontSize={5}
          fill="#666"
          fontWeight="500"
          transform={`rotate(-90, -14, ${sl / 2})`}
        >
          {sheet.sheetLength} mm
        </text>

        {/* Placed parts */}
        {sheet.parts.map((p, i) => (
          <PartRect
            key={i}
            part={p}
            scale={S}
            color={colorBlindMode ? cbColor(i) : mat.color}
            isHovered={hoveredPartId === p.partId}
            isFaded={hoveredPartId !== null && hoveredPartId !== p.partId}
            onHover={onHoverPart}
            showLabel={showPartNames}
            shadowFilterId={`shadow-${sheet.sheetIndex}`}
            showGrain={mat.hasGrain}
          />
        ))}

        {/* ── Scale bar (Sprint 159): 100 mm reference at bottom-right ── */}
        {/* 100 mm × S = 12 SVG units */}
        <g transform={`translate(${sw - 14}, ${sl + 6})`}>
          <line x1={0} y1={0} x2={12} y2={0} stroke="#888" strokeWidth={1} />
          <line x1={0} y1={-2} x2={0} y2={2} stroke="#888" strokeWidth={0.8} />
          <line x1={12} y1={-2} x2={12} y2={2} stroke="#888" strokeWidth={0.8} />
          <text x={6} y={-3} textAnchor="middle" fontSize={3.5} fill="#888">
            100 mm
          </text>
        </g>
      </svg>

      {/* Part legend below the sheet */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
        {sheet.parts.map((p, i) => (
          <span
            key={i}
            className={`text-[10px] cursor-default transition-opacity ${
              hoveredPartId && hoveredPartId !== p.partId ? 'opacity-30' : ''
            } ${hoveredPartId === p.partId ? 'font-bold text-wood-700 dark:text-wood-100' : 'text-wood-600 dark:text-wood-300'}`}
            onMouseEnter={() => onHoverPart(p.partId)}
            onMouseLeave={() => onHoverPart(null)}
          >
            {p.partId}: {p.label} ({p.width}×{p.length})
          </span>
        ))}
      </div>

      {/* Sprint 131 — Grain direction legend: only shown for grain-locked materials */}
      {mat.hasGrain && (
        <p className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
          <IconGrainVertical size={12} className="inline" />
          {t('optimizer.grainLegend')}
        </p>
      )}
    </div>
  );
}

/** Interactive part rect with hover highlight + tooltip + edge banding indicators */
function PartRect({
  part,
  scale,
  color,
  isHovered,
  isFaded,
  onHover,
  showLabel,
  shadowFilterId,
  showGrain,
}: {
  part: CutRect;
  scale: number;
  color: string;
  isHovered: boolean;
  isFaded: boolean;
  onHover: (id: string | null) => void;
  showLabel: boolean;
  shadowFilterId?: string;
  showGrain: boolean;
}) {
  const x = part.x * scale;
  const y = part.y * scale;
  const w = part.width * scale;
  const h = part.length * scale;
  const hasEB = part.edgeBanding && part.edgeBanding !== 'None' && part.edgeBanding !== 'ללא';
  const is4Edge = hasEB && part.edgeBanding!.includes('4');
  const ebColor = '#FF6B35'; // orange indicator for edge banding

  return (
    <g onMouseEnter={() => onHover(part.partId)} onMouseLeave={() => onHover(null)} style={{ cursor: 'pointer' }}>
      <rect
        x={x + 0.3}
        y={y + 0.3}
        width={w - 0.6}
        height={h - 0.6}
        fill={isHovered ? '#FFD700' : color}
        stroke={isHovered ? '#B8860B' : '#555'}
        strokeWidth={isHovered ? 1.5 : 0.6}
        opacity={isFaded ? 0.25 : 0.88}
        rx={1}
        filter={shadowFilterId ? `url(#${shadowFilterId})` : undefined}
        className="transition-all duration-150"
      />
      {/* Edge banding indicators — colored lines on banded edges */}
      {hasEB && (
        <>
          {/* Front edge (bottom of part) */}
          <line
            x1={x}
            y1={y + h}
            x2={x + w}
            y2={y + h}
            stroke={ebColor}
            strokeWidth={2}
            opacity={isFaded ? 0.2 : 0.9}
          />
          {is4Edge && (
            <>
              <line x1={x} y1={y} x2={x + w} y2={y} stroke={ebColor} strokeWidth={2} opacity={isFaded ? 0.2 : 0.9} />
              <line x1={x} y1={y} x2={x} y2={y + h} stroke={ebColor} strokeWidth={2} opacity={isFaded ? 0.2 : 0.9} />
              <line
                x1={x + w}
                y1={y}
                x2={x + w}
                y2={y + h}
                stroke={ebColor}
                strokeWidth={2}
                opacity={isFaded ? 0.2 : 0.9}
              />
            </>
          )}
        </>
      )}
      {/* Grain direction arrow — only for grain-sensitive materials */}
      {showGrain &&
        w > 8 &&
        h > 8 &&
        (part.grainVertical ? (
          <g opacity={isFaded ? 0.15 : 0.45} pointerEvents="none">
            <line x1={x + w - 3} y1={y + 4} x2={x + w - 3} y2={y + h - 4} stroke="#444" strokeWidth={0.6} />
            <polygon points={`${x + w - 3},${y + 4} ${x + w - 4.5},${y + 7} ${x + w - 1.5},${y + 7}`} fill="#444" />
          </g>
        ) : (
          <g opacity={isFaded ? 0.15 : 0.45} pointerEvents="none">
            <line x1={x + 4} y1={y + h - 3} x2={x + w - 4} y2={y + h - 3} stroke="#444" strokeWidth={0.6} />
            <polygon
              points={`${x + w - 4},${y + h - 3} ${x + w - 7},${y + h - 4.5} ${x + w - 7},${y + h - 1.5}`}
              fill="#444"
            />
          </g>
        ))}
      {/* Part label (name) — shown when showLabel is true and rect is tall enough */}
      {showLabel && w > 12 && h > 16 && (
        <text
          x={x + w / 2}
          y={y + h / 2 - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.min(5.5, w * 0.1)}
          fill={isHovered ? '#333' : '#666'}
          opacity={isFaded ? 0.3 : 0.9}
          pointerEvents="none"
        >
          {part.label.length > 13 ? part.label.slice(0, 12) + '…' : part.label}
        </text>
      )}
      <text
        x={x + w / 2}
        y={showLabel && w > 12 && h > 16 ? y + h / 2 + 1 : y + h / 2 - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(7, w * 0.14)}
        fontWeight={isHovered ? 'bold' : 'normal'}
        fill={isHovered ? '#333' : '#444'}
      >
        {part.partId}
      </text>
      <text
        x={x + w / 2}
        y={showLabel && w > 12 && h > 16 ? y + h / 2 + 9 : y + h / 2 + 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(5, w * 0.1)}
        fill="#666"
      >
        {part.width}×{part.length}
      </text>
      <title>{`${part.partId}: ${part.label}\n${part.width} × ${part.length} mm\nGrain: ${part.grainVertical ? '↕ vertical' : '↔ horizontal'}${hasEB ? `\nEdge: ${part.edgeBanding}` : ''}`}</title>
    </g>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-wood-50 dark:bg-wood-800 rounded p-3 text-center">
      <div className="text-lg font-bold text-wood-700 dark:text-wood-200">{value}</div>
      <div className="text-xs text-wood-600 dark:text-wood-300">{label}</div>
    </div>
  );
}

function YieldBar({ yieldPercent }: { yieldPercent: number }) {
  // Color: <33 red, <66 amber, else green.
  const color = yieldPercent < 33 ? 'bg-red-500' : yieldPercent < 66 ? 'bg-amber-500' : 'bg-green-500';
  const label = `${yieldPercent}%`;
  return (
    <div
      className="flex items-center gap-2 shrink-0"
      title={`Sheet utilization ${label}`}
      role="meter"
      aria-valuenow={yieldPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Yield ${label}`}
    >
      <div className="w-24 h-2 bg-wood-200 dark:bg-wood-700 rounded overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${Math.min(100, yieldPercent)}%` }} />
      </div>
      <span className="text-xs font-mono w-10 text-right text-wood-600 dark:text-wood-300">{label}</span>
    </div>
  );
}

/** Sprint 7 — "Why this layout?" placement statistics explainer panel. */
function OptimizerExplainerPanel({
  sheets,
  t,
}: {
  sheets: CutSheet[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [open, setOpen] = useState(false);

  if (sheets.length === 0) return null;

  const totalParts = sheets.reduce((s, sh) => s + sh.parts.length, 0);
  const rotatedParts = sheets.reduce((s, sh) => s + sh.parts.filter((p) => p.rotated).length, 0);
  const grainLockedParts = sheets.reduce((s, sh) => s + sh.parts.filter((p) => p.grainVertical).length, 0);
  const overallYield =
    sheets.length > 0
      ? Math.round(sheets.reduce((s, sh) => s + sh.yieldPercent, 0) / sheets.length)
      : 0;

  const qualityLabel =
    overallYield >= 75
      ? t('optimizer.explainer.qualityExcellent')
      : overallYield >= 55
        ? t('optimizer.explainer.qualityGood')
        : t('optimizer.explainer.qualityFair');

  const qualityColor =
    overallYield >= 75
      ? 'text-green-700 dark:text-green-400'
      : overallYield >= 55
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400';

  return (
    <div className="rounded border border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-900/50 print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors rounded"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <IconLightbulb size={13} />
          {t('optimizer.explainer.title')}
          <span className={`font-semibold ${qualityColor}`}>{qualityLabel}</span>
        </span>
        {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 text-xs text-wood-600 dark:text-wood-300">
          <p>{t('optimizer.explainer.algorithm')}</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              {t('optimizer.explainer.placedParts', { total: totalParts, sheets: sheets.length })}
            </li>
            {rotatedParts > 0 && (
              <li>
                {t('optimizer.explainer.rotatedParts', { count: rotatedParts })}
              </li>
            )}
            {grainLockedParts > 0 && (
              <li>
                {t('optimizer.explainer.grainLocked', { count: grainLockedParts })}
              </li>
            )}
            <li>
              {t('optimizer.explainer.yieldResult', { yield: overallYield })}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
