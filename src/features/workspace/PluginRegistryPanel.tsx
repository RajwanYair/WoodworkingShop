import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { activatePlugin, deactivatePlugin, getRegistryEntries, type PluginRegistryEntry } from '../../engine/core';
import { getPluginContract, pluginEventBus, type PluginStability } from '../../engine/core/plugin';
import { dispatchBrowserEvent } from '../../store/platform-boundary';
import { EmptyState } from '../../ui/EmptyState';

// ── Stability badge colours ───────────────────────────────────────────────

const STABILITY_CLASSES: Record<PluginStability, string> = {
  stable: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  experimental: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  deprecated: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Displays runtime-registered plugins and controls their engine lifecycle state.
 */
export function PluginRegistryPanel() {
  const { t } = useTranslation();
  const contract = getPluginContract();
  const [entries, setEntries] = useState<readonly PluginRegistryEntry[]>(() => getRegistryEntries());
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setEntries(getRegistryEntries());
    const cleanupCallbacks = [
      pluginEventBus.on('plugin:install', refresh),
      pluginEventBus.on('plugin:uninstall', refresh),
      pluginEventBus.on('plugin:activate', refresh),
      pluginEventBus.on('plugin:deactivate', refresh),
      pluginEventBus.on('plugin:error', refresh),
    ];
    refresh();
    return () => cleanupCallbacks.forEach((cleanup) => cleanup());
  }, []);

  function toggle(entry: PluginRegistryEntry) {
    const result = entry.state === 'active' ? deactivatePlugin(entry.plugin.id) : activatePlugin(entry.plugin.id);
    setActionError(result.ok ? null : result.error);
    setEntries(getRegistryEntries());
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

      {entries.length === 0 ? (
        <EmptyState
          title={t('plugins.empty')}
          description={t('plugins.emptyDescription')}
          action={
            <button
              type="button"
              onClick={() => dispatchBrowserEvent('marketplace:open')}
              className="bg-accent hover:bg-accent-hover rounded-lg px-3 py-1.5 text-xs font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t('plugins.browseMarketplace')}
            </button>
          }
        />
      ) : (
        <>
          {actionError && (
            <p role="alert" className="text-xs text-red-700 dark:text-red-300">
              {actionError}
            </p>
          )}
          <ul className="space-y-2" aria-label={t('plugins.title')}>
            {entries.map((entry) => {
              const plugin = entry.plugin;
              const isActive = entry.state === 'active';
              const canToggle = isActive || entry.state === 'deactivated';
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
                    <span className="text-wood-500 dark:text-wood-400 block text-xs">
                      {entry.state === 'error'
                        ? t('plugins.error')
                        : isActive
                          ? t('plugins.enabled')
                          : t('plugins.disabled')}
                    </span>
                    {entry.lastError && (
                      <span role="alert" className="block text-xs text-red-700 dark:text-red-300">
                        {t('plugins.lifecycleError', { message: entry.lastError })}
                      </span>
                    )}
                  </div>

                  {canToggle && (
                    <button
                      type="button"
                      onClick={() => toggle(entry)}
                      aria-pressed={isActive}
                      aria-label={t(isActive ? 'plugins.disable' : 'plugins.enable', { name: plugin.name })}
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-wood-100 text-wood-500 dark:bg-wood-700 dark:text-wood-400'
                      }`}
                    >
                      {isActive ? t('plugins.enabled') : t('plugins.disabled')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
