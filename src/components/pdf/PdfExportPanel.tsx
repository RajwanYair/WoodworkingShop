import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { pdf } from '@react-pdf/renderer';
import { useCabinetStore } from '../../store/cabinet-store';
import { CabinetPdfDocument } from './CabinetPdfDocument';
import type { CabinetPdfEntry } from './CabinetPdfDocument';
import { generateErpPayload, downloadErpJson } from '../../utils/erp-export';
import { useToastStore } from '../../store/toast-store';
import type { Lang } from '../../engine/types';
import { generateParts, computeEdgeBandingTotal } from '../../engine/parts';
import { generateHardware } from '../../engine/hardware';
import { computeDimensions } from '../../engine/dimensions';

export function PdfExportPanel() {
  const { t, i18n } = useTranslation();
  const store = useCabinetStore();
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [includeCover, setIncludeCover] = useState(true); // v3.19.0
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER'>('A4'); // Sprint 59
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait'); // Sprint 59

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const lang = i18n.language as Lang;
      const doc = (
        <CabinetPdfDocument
          config={store.config}
          dimensions={store.dimensions}
          parts={store.parts}
          hardware={store.hardware}
          optimization={store.optimization}
          edgeBandingTotal={store.edgeBandingTotal}
          lang={lang}
          projectName={store.projectName}
          includeCover={includeCover}
          cabinetCount={store.cabinets.length}
          pageSize={pageSize}
          orientation={orientation}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName =
        (store.projectName.trim() || 'cabinet-plan')
          .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'cabinet-plan';
      a.download = `${safeName}-${store.config.width}x${store.config.height}x${store.config.depth}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PdfExportPanel] PDF generation failed:', err);
      useToastStore.getState().addToast(t('pdf.error'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  /** v3.58.0 — Export full project: all cabinets share cut sheets by material. */
  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    try {
      const lang = i18n.language as Lang;

      // Build per-cabinet data from the store's cabinet list.
      const allCabinetsData: CabinetPdfEntry[] = store.cabinets.map((cab, ci) => {
        const cabParts = generateParts(cab.config).map((p) => ({
          ...p,
          id: store.cabinets.length > 1 ? `C${ci + 1}-${p.id}` : p.id,
        }));
        return {
          name: cab.name,
          config: cab.config,
          dimensions: computeDimensions(cab.config),
          parts: cabParts,
          hardware: generateHardware(cab.config),
          edgeBandingTotal: computeEdgeBandingTotal(cabParts),
        };
      });

      // Merge hardware across all cabinets, summing quantities for matching IDs.
      const hwMap = new Map<string, (typeof allCabinetsData)[0]['hardware'][0]>();
      for (const cab of allCabinetsData) {
        for (const hw of cab.hardware) {
          const existing = hwMap.get(hw.id);
          if (existing) {
            hwMap.set(hw.id, { ...existing, qty: existing.qty + hw.qty });
          } else {
            hwMap.set(hw.id, { ...hw });
          }
        }
      }
      const allHardware = Array.from(hwMap.values());

      const totalPartsCount = allCabinetsData.reduce((sum, c) => sum + c.parts.length, 0);
      const doc = (
        <CabinetPdfDocument
          config={store.config}
          dimensions={store.dimensions}
          parts={store.parts}
          hardware={store.hardware}
          optimization={store.optimization}
          edgeBandingTotal={store.edgeBandingTotal}
          lang={lang}
          projectName={store.projectName}
          includeCover={includeCover}
          cabinetCount={store.cabinets.length}
          pageSize={pageSize}
          orientation={orientation}
          allCabinetsData={allCabinetsData}
          combinedOptimization={store.combinedOptimization}
          allHardware={allHardware}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName =
        (store.projectName.trim() || 'cabinet-project')
          .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'cabinet-project';
      a.download = `${safeName}-${store.cabinets.length}-cabinets-${totalPartsCount}-parts.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PdfExportPanel] Project PDF generation failed:', err);
      useToastStore.getState().addToast(t('pdf.error'), 'error');
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 py-8 text-center">
        <h2 className="text-wood-700 dark:text-wood-200 text-lg font-semibold">{t('pdf.title')}</h2>
        <p className="text-wood-400 dark:text-wood-500 mx-auto max-w-md text-sm">{t('pdf.description')}</p>

        {/* v3.19.0 — Cover page toggle */}
        <label className="text-wood-600 dark:text-wood-400 inline-flex cursor-pointer items-center gap-2 text-sm select-none">
          <input
            type="checkbox"
            checked={includeCover}
            onChange={(e) => setIncludeCover(e.target.checked)}
            className="rounded accent-amber-500"
          />
          {t('pdf.includeCover', 'Include cover page')}
        </label>

        {/* Sprint 59 — Page size and orientation selectors */}
        <div className="flex flex-wrap justify-center gap-4">
          <label className="text-wood-600 dark:text-wood-400 flex items-center gap-2 text-sm">
            <span>{t('pdf.pageSize')}</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as 'A4' | 'LETTER')}
              aria-label={t('pdf.pageSize')}
              className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 text-wood-700 dark:text-wood-200 rounded border bg-white px-2 py-1 text-xs"
            >
              <option value="A4">{t('pdf.pageSizeA4')}</option>
              <option value="LETTER">{t('pdf.pageSizeLetter')}</option>
            </select>
          </label>
          <label className="text-wood-600 dark:text-wood-400 flex items-center gap-2 text-sm">
            <span>{t('pdf.orientation')}</span>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
              aria-label={t('pdf.orientation')}
              className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 text-wood-700 dark:text-wood-200 rounded border bg-white px-2 py-1 text-xs"
            >
              <option value="portrait">{t('pdf.orientationPortrait')}</option>
              <option value="landscape">{t('pdf.orientationLandscape')}</option>
            </select>
          </label>
        </div>

        {/* v3.65.1 — For multi-cabinet projects, "Export Full Project" is the primary action
            so all cabinets share cut sheets. Single-cabinet export becomes secondary. */}
        {store.cabinets.length > 1 ? (
          <>
            <button
              onClick={handleGenerateAll}
              disabled={generating || generatingAll}
              className="bg-wood-600 hover:bg-wood-700 rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingAll ? t('pdf.generatingAll') : t('pdf.generateAll', { count: store.cabinets.length })}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || generatingAll}
              className="border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:text-wood-700 dark:hover:text-wood-200 rounded-lg border px-6 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? t('pdf.generating') : t('pdf.generateCurrent')}
            </button>
          </>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating || generatingAll}
            className="bg-wood-600 hover:bg-wood-700 rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? t('pdf.generating') : t('pdf.generate')}
          </button>
        )}

        {/* Sprint 13 — ERP/MRP JSON export */}
        <button
          onClick={() => {
            const safeName =
              (store.projectName.trim() || 'cabinet-plan')
                .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') || 'cabinet-plan';
            const payload = generateErpPayload(
              store.projectName,
              store.config,
              store.parts,
              store.hardware,
              store.optimization,
            );
            downloadErpJson(payload, `${safeName}-erp.json`);
            useToastStore.getState().addToast(t('pdf.erpExported'), 'success');
          }}
          className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 border-wood-300 dark:border-wood-600 hover:bg-wood-200 dark:hover:bg-wood-700 rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
        >
          {t('pdf.exportErpJson')}
        </button>
      </div>

      {/* Preview summary */}
      <div className="border-wood-200 dark:border-wood-700 mx-auto max-w-md space-y-2 rounded-lg border p-4">
        <h3 className="text-wood-600 dark:text-wood-300 text-sm font-medium">{t('pdf.contentsTitle')}</h3>
        <ul className="text-wood-600 dark:text-wood-300 list-inside list-disc space-y-1 text-xs">
          {includeCover && (
            <li>
              {store.projectName.trim()
                ? t('pdf.contentsCoverNamed', { name: store.projectName.trim() })
                : t('pdf.contentsCover')}
            </li>
          )}
          <li>{t('pdf.contentsSpecs')}</li>
          <li>{t('pdf.contentsParts', { count: store.parts.length })}</li>
          <li>{t('pdf.contentsHardware', { count: store.hardware.length })}</li>
          <li>{t('pdf.contentsSheets', { count: store.optimization.totalSheets })}</li>
          <li>{t('pdf.contentsPageNumbers')}</li>
        </ul>
      </div>
    </div>
  );
}
