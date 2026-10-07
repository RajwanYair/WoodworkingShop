import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseHardwareCatalog, type HardwareCatalogImportMode, type HardwareItem } from '../../engine/hardware-catalog';
import { useCustomHardwareStore } from '../../store/custom-hardware-store';

export function HardwareCatalogImportPanel() {
  const { t } = useTranslation();
  const existingItems = useCustomHardwareStore((state) => state.items);
  const importCatalog = useCustomHardwareStore((state) => state.importCatalog);
  const [preview, setPreview] = useState<HardwareItem[]>([]);
  const [rawCatalog, setRawCatalog] = useState<unknown>(null);
  const [mode, setMode] = useState<HardwareCatalogImportMode>('merge');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    setPreview([]);
    setRawCatalog(null);
    setError('');
    setResult('');
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const items = parseHardwareCatalog(parsed);
      setPreview(items);
      setRawCatalog(parsed);
      setMode('merge');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const handleImport = () => {
    if (rawCatalog === null) return;
    importCatalog(rawCatalog, mode);
    setResult(t('hardwareCatalog.importSuccess', { count: preview.length }));
    setRawCatalog(null);
    setPreview([]);
  };

  return (
    <section className="border-wood-200 dark:border-wood-700 rounded-lg border p-4">
      <h3 className="text-wood-700 dark:text-wood-200 mb-3 text-sm font-semibold">
        {t('hardwareCatalog.importTitle')}
      </h3>
      <label className="text-wood-700 dark:text-wood-200 block text-xs font-medium" htmlFor="hardware-catalog-file">
        {t('hardwareCatalog.importFile')}
      </label>
      <input
        id="hardware-catalog-file"
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="text-wood-700 dark:text-wood-200 mt-1 block w-full text-sm"
      />

      {preview.length > 0 && (
        <div className="mt-3 space-y-3">
          <p className="text-wood-600 dark:text-wood-300 text-xs">
            {t('hardwareCatalog.importPreview', { count: preview.length })}
          </p>
          <ul className="divide-wood-100 dark:divide-wood-700 max-h-40 divide-y overflow-y-auto border-y">
            {preview.map((item) => (
              <li key={item.id} className="text-wood-700 dark:text-wood-200 flex justify-between gap-3 py-2 text-xs">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0">{item.category}</span>
              </li>
            ))}
          </ul>
          <fieldset className="space-y-2">
            <legend className="text-wood-700 dark:text-wood-200 text-xs font-medium">
              {t('hardwareCatalog.importMode')}
            </legend>
            {(['merge', 'replace'] as const).map((option) => (
              <label key={option} className="text-wood-600 dark:text-wood-300 flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="hardware-catalog-import-mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="accent-accent"
                />
                {t(`hardwareCatalog.import${option === 'merge' ? 'Merge' : 'Replace'}`)}
              </label>
            ))}
          </fieldset>
          {mode === 'merge' && (
            <p className="text-wood-500 dark:text-wood-400 text-xs">
              {t('hardwareCatalog.importExisting', { count: existingItems.length })}
            </p>
          )}
          <button
            type="button"
            onClick={handleImport}
            disabled={rawCatalog === null}
            className="bg-accent hover:bg-accent-hover disabled:bg-wood-300 dark:disabled:bg-wood-700 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed"
          >
            {t('hardwareCatalog.importButton')}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {t('hardwareCatalog.importError', { message: error })}
        </p>
      )}
      {result && (
        <p className="text-wood-500 dark:text-wood-400 mt-2 text-xs" aria-live="polite">
          {result}
        </p>
      )}
      <div className="mt-4">
        <h4 className="text-wood-700 dark:text-wood-200 text-xs font-semibold">
          {t('hardwareCatalog.importStored', { count: existingItems.length })}
        </h4>
        {existingItems.length === 0 ? (
          <p className="text-wood-500 dark:text-wood-400 mt-1 text-xs">{t('hardwareCatalog.importEmpty')}</p>
        ) : (
          <ul className="divide-wood-100 dark:divide-wood-700 mt-1 divide-y">
            {existingItems.map((item) => (
              <li key={item.id} className="text-wood-700 dark:text-wood-200 flex justify-between gap-3 py-2 text-xs">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0">{item.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
