import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { pdf } from '@react-pdf/renderer';
import { useCabinetStore } from '../../store/cabinet-store';
import { CabinetPdfDocument } from './CabinetPdfDocument';
import type { Lang } from '../../engine/types';

export function PdfExportPanel() {
  const { t, i18n } = useTranslation();
  const store = useCabinetStore();
  const [generating, setGenerating] = useState(false);
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
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8 space-y-4">
        <h2 className="text-lg font-semibold text-wood-700 dark:text-wood-200">{t('pdf.title')}</h2>
        <p className="text-sm text-wood-400 dark:text-wood-500 max-w-md mx-auto">{t('pdf.description')}</p>

        {/* v3.19.0 — Cover page toggle */}
        <label className="inline-flex items-center gap-2 text-sm text-wood-600 dark:text-wood-400 cursor-pointer select-none">
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
          <label className="flex items-center gap-2 text-sm text-wood-600 dark:text-wood-400">
            <span>{t('pdf.pageSize')}</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as 'A4' | 'LETTER')}
              aria-label={t('pdf.pageSize')}
              className="rounded border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-800 text-wood-700 dark:text-wood-200 px-2 py-1 text-xs"
            >
              <option value="A4">{t('pdf.pageSizeA4')}</option>
              <option value="LETTER">{t('pdf.pageSizeLetter')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-wood-600 dark:text-wood-400">
            <span>{t('pdf.orientation')}</span>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
              aria-label={t('pdf.orientation')}
              className="rounded border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-800 text-wood-700 dark:text-wood-200 px-2 py-1 text-xs"
            >
              <option value="portrait">{t('pdf.orientationPortrait')}</option>
              <option value="landscape">{t('pdf.orientationLandscape')}</option>
            </select>
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-3 rounded-lg text-sm font-medium bg-wood-600 text-white hover:bg-wood-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? t('pdf.generating') : t('pdf.generate')}
        </button>
      </div>

      {/* Preview summary */}
      <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-4 space-y-2 max-w-md mx-auto">
        <h3 className="text-sm font-medium text-wood-600 dark:text-wood-300">{t('pdf.contentsTitle')}</h3>
        <ul className="text-xs text-wood-600 dark:text-wood-300 space-y-1 list-disc list-inside">
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
