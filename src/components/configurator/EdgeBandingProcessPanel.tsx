import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';

const DEFAULT_PROCESS = { enabled: false, bandThicknessMm: 1, trimAllowanceMm: 0 } as const;

export function EdgeBandingProcessPanel() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const process = config.edgeBandingProcess ?? DEFAULT_PROCESS;

  return (
    <fieldset className="space-y-3">
      <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        {t('config.edgeBandingProcess')}
      </legend>
      <label className="text-wood-700 dark:text-wood-200 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={process.enabled}
          onChange={(event) => setConfig({ edgeBandingProcess: { ...process, enabled: event.target.checked } })}
        />
        {t('config.edgeBandingEnable')}
      </label>
      {process.enabled && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-wood-600 dark:text-wood-300 space-y-1 text-xs">
            <span>{t('config.bandThicknessMm')}</span>
            <input
              type="number"
              min="0.1"
              max="20"
              step="0.1"
              value={process.bandThicknessMm}
              onChange={(event) =>
                setConfig({ edgeBandingProcess: { ...process, bandThicknessMm: Number(event.target.value) } })
              }
              className="border-wood-300 dark:border-wood-600 bg-wood-50 dark:bg-wood-800 w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="text-wood-600 dark:text-wood-300 space-y-1 text-xs">
            <span>{t('config.trimAllowanceMm')}</span>
            <input
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={process.trimAllowanceMm}
              onChange={(event) =>
                setConfig({ edgeBandingProcess: { ...process, trimAllowanceMm: Number(event.target.value) } })
              }
              className="border-wood-300 dark:border-wood-600 bg-wood-50 dark:bg-wood-800 w-full rounded border px-2 py-1 text-sm"
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}
