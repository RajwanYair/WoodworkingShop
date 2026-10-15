import { useTranslation } from 'react-i18next';
import type { RefObject, ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useCabinetStore } from '../../store/cabinet-store';
import { generateErpPayload, downloadErpJson } from '../../utils/erp-export-download';
import { downloadIfcFile } from '../../utils/ifc-download';
import { downloadStepFile } from '../../utils/step-download';
import { downloadGltfFile } from '../../utils/gltf-download';
import { useToastStore } from '../../store/toast-store';

interface PdfExportDownloadsProps {
  includeCover: boolean;
  setIncludeCover: Dispatch<SetStateAction<boolean>>;
  pageSize: 'A4' | 'LETTER';
  setPageSize: Dispatch<SetStateAction<'A4' | 'LETTER'>>;
  orientation: 'portrait' | 'landscape';
  setOrientation: Dispatch<SetStateAction<'portrait' | 'landscape'>>;
  generating: boolean;
  generatingAll: boolean;
  generatingZip: boolean;
  handleGenerate: () => void;
  handleGenerateAll: () => void;
  handleExportZip: () => void;
  handleExportSettings: () => void;
  handleImportSettings: (event: ChangeEvent<HTMLInputElement>) => void;
  settingsFileRef: RefObject<HTMLInputElement | null>;
}

export function PdfExportDownloads({
  includeCover,
  setIncludeCover,
  pageSize,
  setPageSize,
  orientation,
  setOrientation,
  generating,
  generatingAll,
  generatingZip,
  handleGenerate,
  handleGenerateAll,
  handleExportZip,
  handleExportSettings,
  handleImportSettings,
  settingsFileRef,
}: Readonly<PdfExportDownloadsProps>) {
  const { t } = useTranslation();
  const store = useCabinetStore();
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
              className="bg-accent hover:bg-accent-hover rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
            className="bg-accent hover:bg-accent-hover rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Sprint 79 — IFC export */}
        <button
          onClick={() => {
            const safeName =
              (store.projectName.trim() || 'cabinet-plan')
                .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') || 'cabinet-plan';
            downloadIfcFile(store.config, store.parts, safeName);
            useToastStore.getState().addToast(t('pdf.ifcExported'), 'success');
          }}
          className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 border-wood-300 dark:border-wood-600 hover:bg-wood-200 dark:hover:bg-wood-700 rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
        >
          {t('pdf.exportIfc')}
        </button>

        {/* Sprint 80 — STEP export */}
        <button
          onClick={() => {
            const safeName =
              (store.projectName.trim() || 'cabinet-plan')
                .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') || 'cabinet-plan';
            downloadStepFile(store.config, store.parts, safeName);
            useToastStore.getState().addToast(t('pdf.stepExported'), 'success');
          }}
          className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 border-wood-300 dark:border-wood-600 hover:bg-wood-200 dark:hover:bg-wood-700 rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
        >
          {t('pdf.exportStep')}
        </button>

        {/* Sprint 84 — glTF 2.0 export */}
        <button
          onClick={() => {
            const safeName =
              (store.projectName.trim() || 'cabinet-plan')
                .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') || 'cabinet-plan';
            downloadGltfFile(store.config, store.parts, safeName);
            useToastStore.getState().addToast(t('pdf.gltfExported'), 'success');
          }}
          className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 border-wood-300 dark:border-wood-600 hover:bg-wood-200 dark:hover:bg-wood-700 rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
        >
          {t('pdf.exportGltf')}
        </button>

        {/* Sprint 86 — ZIP bundle export */}
        <button
          onClick={handleExportZip}
          disabled={generating || generatingAll || generatingZip}
          className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 border-wood-300 dark:border-wood-600 hover:bg-wood-200 dark:hover:bg-wood-700 rounded-lg border px-6 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generatingZip ? t('pdf.generatingZip') : t('pdf.exportZip')}
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
          <li>
            {t('pdf.contentsParts', { count: store.cabinets.length > 1 ? store.allParts.length : store.parts.length })}
          </li>
          <li>{t('pdf.contentsHardware', { count: store.hardware.length })}</li>
          <li>
            {t('pdf.contentsSheets', {
              count:
                store.cabinets.length > 1 ? store.combinedOptimization.totalSheets : store.optimization.totalSheets,
            })}
          </li>
          <li>{t('pdf.contentsPageNumbers')}</li>
        </ul>
      </div>

      {/* Project settings export / import */}
      <div className="border-wood-200 dark:border-wood-700 mx-auto max-w-md rounded-lg border p-4">
        <h3 className="text-wood-600 dark:text-wood-300 mb-2 text-sm font-medium">{t('pdf.projectSettings')}</h3>
        <p className="text-wood-400 dark:text-wood-500 mb-3 text-xs">{t('pdf.settingsDescription')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleExportSettings}
            className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 border-wood-300 dark:border-wood-600 hover:bg-wood-200 dark:hover:bg-wood-700 rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
          >
            {t('pdf.exportSettings')}
          </button>
          <button
            onClick={() => settingsFileRef.current?.click()}
            className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 border-wood-300 dark:border-wood-600 hover:bg-wood-200 dark:hover:bg-wood-700 rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
          >
            {t('pdf.importSettings')}
          </button>
          <input
            ref={settingsFileRef}
            type="file"
            accept=".json"
            onChange={handleImportSettings}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
