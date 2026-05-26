import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { getMaterial } from '../../engine/materials';
import { generateParts } from '../../engine/parts';
import { generateHardware } from '../../engine/hardware';
import { downloadAllSheetsDxf } from '../../utils/dxf-export';
import { triggerDownload } from '../../utils/download';
import { GcodePreviewModal } from './GcodePreviewModal';
import { generateBomCsv } from '../../utils/bom-export';
import { IconWarning, IconLightbulb } from '../layout/Icons';

import { OptimizationNotesPanel } from './OptimizationNotesPanel';
import { WasteAnalyticsPanel } from './WasteAnalyticsPanel';
import { CutChecklistPanel } from './CutChecklistPanel';
import { StockTrackerPanel } from './StockTrackerPanel';
import { GrainReportPanel } from './GrainReportPanel';
import { PartLabelSheet } from './PartLabelSheet';
import { CutPlanSummaryPanel } from './CutPlanSummaryPanel';
import { VirtualSheetWrapper } from './VirtualSheetWrapper';
import BomWorker from '../../workers/bom-export.worker?worker';
import type { BomWorkerOutput } from '../../workers/bom-export.worker';
import DxfWorker from '../../workers/dxf-export.worker?worker';
import type { DxfWorkerOutput } from '../../workers/dxf-export.worker';
import { BulkReplaceModal } from './BulkReplaceModal';
import { idbLoadOffcuts, idbSaveOffcut, idbDeleteOffcut } from '../../utils/indexed-db-storage';
import type { Lang, CutSheet } from '../../engine/types';
import { SheetCard } from './SheetCard';
import { OptimizerExplainerPanel } from './OptimizerExplainerPanel';
import { OffcutsPanel } from './optimizer-offcuts-panel';
import { MaterialSummaryPanel } from './optimizer-material-summary-panel';
import { DefectZonePanel } from './optimizer-defect-zone-panel';
import { ShoppingListPanel } from './optimizer-shopping-list-panel';
import { OptimizerToolbar } from './OptimizerToolbar';

export function OptimizerView() {
  const { t, i18n } = useTranslation();
  const {
    optimization,
    combinedOptimization,
    optimizationPending,
    cabinets,
    colorBlindMode,
    materialPriceOverrides,
    projectName,
    sheetSizeOverrides,
    setSheetSizeOverride,
    rotationLockedPartIds,
    toggleRotationLock,
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

      {/* Summary stats + export/toggle toolbar */}
      <OptimizerToolbar
        sheets={[...displayOpt.sheets]}
        totalSheets={displayOpt.totalSheets}
        overallYield={displayOpt.overallYield}
        totalWaste={displayOpt.totalWaste}
        grainConflictCount={displayOpt.grainConflictCount}
        partFilter={partFilter}
        setPartFilter={setPartFilter}
        showPartNames={showPartNames}
        setShowPartNames={setShowPartNames}
        showGrainHatch={showGrainHatch}
        setShowGrainHatch={setShowGrainHatch}
        bomExporting={bomExporting}
        dxfExporting={dxfExporting}
        handleBomExportWorker={handleBomExportWorker}
        handleDxfExportWorker={handleDxfExportWorker}
        filePrefix={filePrefix}
        lang={lang}
        setShowBulkReplace={setShowBulkReplace}
        t={t}
      />

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

      {/* Sprint 92 — Smart waste analytics */}
      <WasteAnalyticsPanel result={displayOpt} />

      {/* Sprint 94 — Part cutting checklist */}
      <CutChecklistPanel />

      {/* Sprint 97 — Stock tracker dashboard */}
      <StockTrackerPanel />

      {/* Sprint 98 — Grain direction report */}
      <GrainReportPanel />

      {/* Sprint 100 — Part label sheet */}
      <PartLabelSheet />

      {/* Sprint 103 — Cut plan summary */}
      <CutPlanSummaryPanel />

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
