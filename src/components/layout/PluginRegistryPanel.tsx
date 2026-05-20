import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPlugins, getPluginContract, type CabinetPlannerPlugin, type PluginStability } from '../../engine/plugin';

// ── Stability badge colours ───────────────────────────────────────────────

const STABILITY_CLASSES: Record<PluginStability, string> = {
  stable: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  experimental: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  deprecated: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Displays registered Cabinet Planner plugins with an enable/disable toggle.
 * Plugin enable/disable state is local to this component — persisting it to
 * the store is a future enhancement (the engine already supports unregisterPlugin).
 */
export function PluginRegistryPanel() {
  const { t } = useTranslation();
  const plugins = getPlugins();
  const contract = getPluginContract();

  // Local disabled-set: ids of plugins the user has toggled off in this session.
  const [disabledIds, setDisabledIds] = useState<ReadonlySet<string>>(new Set());

  function toggle(plugin: CabinetPlannerPlugin) {
    setDisabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(plugin.id)) {
        next.delete(plugin.id);
      } else {
        next.add(plugin.id);
      }
      return next;
    });
  }

  return (
    <section aria-labelledby="plugin-registry-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="plugin-registry-heading" className="text-wood-700 dark:text-wood-300 text-sm font-semibold">
          {t('plugins.title')}
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-xs ${STABILITY_CLASSES[contract.stability]}`}
          title={t('plugins.stability', { level: contract.stability })}
        >
          {t('plugins.apiVersion', { version: contract.apiVersion })}
        </span>
      </div>

      {plugins.length === 0 ? (
        <p className="text-wood-500 dark:text-wood-400 text-xs italic">{t('plugins.empty')}</p>
      ) : (
        <ul className="space-y-2" aria-label={t('plugins.title')}>
          {plugins.map((plugin) => {
            const isDisabled = disabledIds.has(plugin.id);
            return (
              <li
                key={plugin.id}
                className="border-wood-200 dark:border-wood-700 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-wood-800 dark:text-wood-200 block truncate font-medium">{plugin.name}</span>
                  <span className="text-wood-500 dark:text-wood-400 font-mono text-xs">
                    {plugin.id} · {t('plugins.version', { version: plugin.version })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggle(plugin)}
                  aria-pressed={!isDisabled}
                  aria-label={
                    isDisabled
                      ? t('plugins.enable', { name: plugin.name })
                      : t('plugins.disable', { name: plugin.name })
                  }
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    isDisabled
                      ? 'bg-wood-100 text-wood-500 dark:bg-wood-700 dark:text-wood-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  }`}
                >
                  {isDisabled ? t('plugins.disabled') : t('plugins.enabled')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
