/**
 * Sprint 77 — UI panel that lets users import materials from a community
 * catalog JSON URL and add selected entries to their custom-materials store.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import { fetchCommunityCatalog, communityMaterialToMaterial } from '../../utils/catalog-import';
import type { CommunityMaterial } from '../../engine/community-catalog';

type ImportStatus = 'idle' | 'loading' | 'done' | 'error';

export function CatalogImportPanel() {
  const { t } = useTranslation();
  const { materials: existing, addMaterial } = useCustomMaterialsStore();

  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview] = useState<CommunityMaterial[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addedCount, setAddedCount] = useState(0);

  const existingKeys = new Set(existing.map((m) => m.key));

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus('loading');
    setPreview([]);
    setSelected(new Set());
    setAddedCount(0);
    setErrorMsg('');
    try {
      const catalog = await fetchCommunityCatalog(trimmed);
      setPreview(catalog.materials);
      // Pre-select materials not already in the library
      const auto = new Set(catalog.materials.filter((cm) => !existingKeys.has(`cat-${cm.id}`)).map((cm) => cm.id));
      setSelected(auto);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    let count = 0;
    for (const cm of preview) {
      if (selected.has(cm.id) && !existingKeys.has(`cat-${cm.id}`)) {
        addMaterial(communityMaterialToMaterial(cm));
        count++;
      }
    }
    setAddedCount(count);
    setSelected(new Set());
  };

  return (
    <section className="border-wood-200 dark:border-wood-700 rounded-lg border p-4">
      <h3 className="text-wood-700 dark:text-wood-200 mb-3 text-sm font-semibold">{t('catalogImport.title')}</h3>

      {/* URL input */}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="catalog-url">
          {t('catalogImport.urlLabel')}
        </label>
        <input
          id="catalog-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('catalogImport.urlPlaceholder')}
          className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 text-wood-800 dark:text-wood-200 focus:ring-wood-500 min-w-0 flex-1 rounded border bg-white px-2 py-1 text-sm focus:ring-2 focus:outline-none"
          disabled={status === 'loading'}
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={status === 'loading' || !url.trim()}
          className="bg-wood-600 hover:bg-wood-700 disabled:bg-wood-300 dark:disabled:bg-wood-700 rounded px-3 py-1 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed"
        >
          {status === 'loading' ? t('catalogImport.importing') : t('catalogImport.importButton')}
        </button>
      </div>

      {/* Error */}
      {status === 'error' && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {t('catalogImport.errorFetch', { message: errorMsg })}
        </p>
      )}

      {/* Preview list */}
      {status === 'done' && preview.length === 0 && (
        <p className="text-wood-400 dark:text-wood-500 mt-3 text-xs">{t('catalogImport.noMaterials')}</p>
      )}

      {status === 'done' && preview.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-wood-600 dark:text-wood-300 text-xs font-medium">
            {t('catalogImport.previewTitle', { count: preview.length })}
          </p>

          <ul className="divide-wood-100 dark:divide-wood-700 border-wood-200 dark:border-wood-700 divide-y rounded border">
            {preview.map((cm) => {
              const inLibrary = existingKeys.has(`cat-${cm.id}`);
              return (
                <li key={cm.id} className="flex items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    id={`cat-import-${cm.id}`}
                    checked={selected.has(cm.id) && !inLibrary}
                    disabled={inLibrary}
                    onChange={() => toggleSelect(cm.id)}
                    className="accent-wood-600"
                  />
                  <div
                    className="border-wood-200 dark:border-wood-600 h-4 w-4 shrink-0 rounded-sm border"
                    style={{ backgroundColor: cm.color ?? '#c8a86b' }}
                    aria-hidden="true"
                  />
                  <label htmlFor={`cat-import-${cm.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="text-wood-800 dark:text-wood-100 block truncate text-sm font-medium">
                      {cm.name}
                    </span>
                    <span className="text-wood-400 dark:text-wood-500 block text-xs">
                      {cm.thickness} mm · {cm.pricePerSqM} {cm.currency}/m²
                      {cm.supplier ? ` · ${cm.supplier}` : ''}
                    </span>
                  </label>
                  {inLibrary && (
                    <span className="text-wood-400 dark:text-wood-500 shrink-0 text-xs">
                      {t('catalogImport.alreadyExists')}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Add button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="bg-wood-600 hover:bg-wood-700 disabled:bg-wood-300 dark:disabled:bg-wood-700 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed"
          >
            {t('catalogImport.addSelected')}
          </button>

          {addedCount > 0 && (
            <p className="text-wood-500 dark:text-wood-400 text-xs">
              {t('catalogImport.added', { count: addedCount })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
