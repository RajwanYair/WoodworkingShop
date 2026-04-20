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
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cabinet-plan-${store.config.width}x${store.config.height}x${store.config.depth}.pdf`;
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
        <p className="text-sm text-wood-400 dark:text-wood-500 max-w-md mx-auto">
          Generate a complete PDF build plan including specifications, parts list, hardware list, and cut sheet
          diagrams.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-3 rounded-lg text-sm font-medium bg-wood-500 text-white hover:bg-wood-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? t('pdf.generating') : t('pdf.generate')}
        </button>
      </div>

      {/* Preview summary */}
      <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-4 space-y-2 max-w-md mx-auto">
        <h3 className="text-sm font-medium text-wood-600 dark:text-wood-300">PDF Contents:</h3>
        <ul className="text-xs text-wood-500 dark:text-wood-400 space-y-1 list-disc list-inside">
          <li>Cover page with cabinet dimensions</li>
          <li>Full specifications</li>
          <li>Parts list ({store.parts.length} parts)</li>
          <li>Hardware list ({store.hardware.length} items)</li>
          <li>Cut sheet diagrams ({store.optimization.totalSheets} sheets)</li>
        </ul>
      </div>
    </div>
  );
}
