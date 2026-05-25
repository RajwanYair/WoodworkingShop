/**
 * Sprint 87 — Plugin Marketplace Panel
 *
 * Browses, installs, and uninstalls Cabinet Planner plugins from a bundled
 * stub catalog.  Network fetching is intentionally deferred (offline-first).
 */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  installPlugin,
  uninstallPlugin,
  isPluginInstalled,
  searchPlugins,
  type MarketplacePlugin,
  type MarketplaceCatalog,
  type PluginCategory,
} from '../../utils/plugin-marketplace';

// ─── Stub catalog (offline-first / development) ───────────────────────────────

const STUB_CATALOG: MarketplaceCatalog = {
  version: '1.0',
  fetchedAt: '2026-05-25T00:00:00.000Z',
  plugins: [
    {
      id: 'com.cabinet-planner.gcode-post-fanuc',
      name: 'FANUC G-code Post-processor',
      description: 'Converts Cabinet Planner G-code to FANUC-compatible dialect with tool-change macros.',
      version: '1.2.0',
      author: 'CNC Tools Ltd.',
      category: 'export',
      packageUrl: '',
      rating: 4.7,
      downloads: 1240,
      publishedAt: '2026-03-10T00:00:00.000Z',
      minApiVersion: '1.0',
      tags: ['gcode', 'fanuc', 'cnc'],
    },
    {
      id: 'com.cabinet-planner.optimizer-guillotine',
      name: 'Guillotine Cut Optimizer',
      description: 'Alternative cutting strategy using a top-down guillotine algorithm for panel saws.',
      version: '0.9.1',
      author: 'Open Timber Collective',
      category: 'optimizer',
      packageUrl: '',
      rating: 4.2,
      downloads: 870,
      publishedAt: '2026-01-18T00:00:00.000Z',
      minApiVersion: '1.0',
      tags: ['guillotine', 'panel-saw', 'optimizer'],
    },
    {
      id: 'com.cabinet-planner.preview-pbr',
      name: 'PBR Material Preview',
      description: 'Physically-based rendering (PBR) material textures for the 3D preview.',
      version: '2.0.0',
      author: 'Shader Studio',
      category: 'preview',
      packageUrl: '',
      rating: 4.9,
      downloads: 3100,
      publishedAt: '2026-04-02T00:00:00.000Z',
      minApiVersion: '1.0',
      tags: ['pbr', 'materials', 'preview', '3d'],
    },
    {
      id: 'com.cabinet-planner.bom-excel',
      name: 'Excel BOM Export',
      description: 'Export the bill of materials as a formatted .xlsx file with formula-based totals.',
      version: '1.0.3',
      author: 'DataWood GmbH',
      category: 'export',
      packageUrl: '',
      rating: 4.5,
      downloads: 2050,
      publishedAt: '2026-02-20T00:00:00.000Z',
      minApiVersion: '1.0',
      tags: ['bom', 'excel', 'xlsx', 'export'],
    },
    {
      id: 'com.cabinet-planner.theme-nordic',
      name: 'Nordic Light Theme',
      description: 'A cool-blue, high-contrast light theme inspired by Scandinavian design.',
      version: '1.1.0',
      author: 'Nordic UI',
      category: 'theme',
      packageUrl: '',
      rating: 4.3,
      downloads: 640,
      publishedAt: '2026-01-05T00:00:00.000Z',
      minApiVersion: '1.0',
      tags: ['theme', 'nordic', 'light'],
    },
    {
      id: 'com.cabinet-planner.util-grain-advisor',
      name: 'Grain Direction Advisor',
      description: 'AI-assisted grain direction recommendations to minimise visual mismatches across adjacent panels.',
      version: '0.8.0',
      author: 'WoodAI Labs',
      category: 'utility',
      packageUrl: '',
      rating: 3.9,
      downloads: 310,
      publishedAt: '2026-05-01T00:00:00.000Z',
      minApiVersion: '1.0',
      tags: ['grain', 'ai', 'advisor'],
    },
  ],
};

const CATEGORY_ALL = 'all' as const;
type FilterCategory = PluginCategory | typeof CATEGORY_ALL;

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: 'marketplace.catAll',
  export: 'marketplace.catExport',
  optimizer: 'marketplace.catOptimizer',
  preview: 'marketplace.catPreview',
  utility: 'marketplace.catUtility',
  theme: 'marketplace.catTheme',
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span aria-label={`${rating.toFixed(1)} stars`} className="text-xs text-amber-400">
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(5 - full - (half ? 1 : 0))}
      <span className="text-wood-400 ms-1">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MarketplacePanelProps {
  onClose: () => void;
}

export function MarketplacePanel({ onClose }: MarketplacePanelProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FilterCategory>(CATEGORY_ALL);
  const [installed, setInstalled] = useState<Set<string>>(
    () => new Set(STUB_CATALOG.plugins.filter((p) => isPluginInstalled(p.id)).map((p) => p.id)),
  );

  const filtered = searchPlugins(
    STUB_CATALOG,
    query,
    category === CATEGORY_ALL ? undefined : category,
  ) as MarketplacePlugin[];

  const toggle = (id: string) => {
    if (installed.has(id)) {
      uninstallPlugin(id);
      setInstalled((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      installPlugin(id);
      setInstalled((prev) => new Set(prev).add(id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — click outside to close */}
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-black/50 p-0"
        onClick={onClose}
        aria-label={t('marketplace.close')}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('marketplace.title')}
        className="dark:bg-wood-900 border-wood-200 dark:border-wood-700 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-wood-800 dark:text-wood-100 text-base font-semibold">🛒 {t('marketplace.title')}</h2>
          <button
            onClick={onClose}
            className="text-wood-400 hover:text-wood-700 dark:hover:text-wood-200"
            aria-label={t('marketplace.close')}
          >
            ✕
          </button>
        </div>

        {/* Search + filter */}
        <div className="border-wood-200 dark:border-wood-700 space-y-3 border-b px-5 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('marketplace.searchPlaceholder')}
            aria-label={t('marketplace.searchPlaceholder')}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 text-wood-800 dark:text-wood-100 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('marketplace.filterLabel')}>
            {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                aria-pressed={category === cat}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  category === cat
                    ? 'bg-wood-600 text-white'
                    : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
                }`}
              >
                {t(CATEGORY_LABELS[cat])}
              </button>
            ))}
          </div>
        </div>

        {/* Plugin list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="text-wood-400 py-8 text-center text-sm">{t('marketplace.noResults')}</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((plugin) => {
                const isOn = installed.has(plugin.id);
                return (
                  <li
                    key={plugin.id}
                    className="border-wood-200 dark:border-wood-700 flex items-start justify-between gap-4 rounded-lg border p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-wood-800 dark:text-wood-100 text-sm font-medium">{plugin.name}</span>
                        <span className="text-wood-400 text-xs">v{plugin.version}</span>
                        <span className="bg-wood-100 dark:bg-wood-800 text-wood-500 dark:text-wood-400 rounded px-1.5 py-0.5 text-xs capitalize">
                          {plugin.category}
                        </span>
                      </div>
                      <p className="text-wood-500 dark:text-wood-400 mt-1 text-xs">{plugin.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        {plugin.rating != null && <StarRating rating={plugin.rating} />}
                        {plugin.downloads != null && (
                          <span className="text-wood-400 text-xs">
                            {t('marketplace.downloads', { count: plugin.downloads })}
                          </span>
                        )}
                        <span className="text-wood-400 text-xs">{t('marketplace.by', { author: plugin.author })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(plugin.id)}
                      aria-pressed={isOn}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isOn
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300'
                          : 'bg-wood-600 hover:bg-wood-700 text-white'
                      }`}
                    >
                      {isOn ? t('marketplace.uninstall') : t('marketplace.install')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-wood-200 dark:border-wood-700 border-t px-5 py-3 text-center">
          <p className="text-wood-400 text-xs">
            {t('marketplace.pluginCount', { count: STUB_CATALOG.plugins.length })} ·{' '}
            {t('marketplace.installedCount', { count: installed.size })} {t('marketplace.installed')}
          </p>
        </div>
      </div>
    </div>
  );
}
