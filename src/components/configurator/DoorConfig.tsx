import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS } from '../../engine/materials';
import type { HandleStyle, DoorStyle, EdgeBanding } from '../../engine/types';

export function DoorConfig() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.doors')}
      </legend>

      {/* Door count */}
      <div className="flex gap-4">
        {([1, 2] as const).map((n) => (
          <label key={n} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="doorCount"
              value={n}
              checked={config.doorCount === n}
              onChange={() => setConfig({ doorCount: n })}
              className="accent-primary"
            />
            {n} {t('config.doors').toLowerCase()}
          </label>
        ))}
      </div>

      {/* Door style */}
      <label className="block">
        <span className="text-sm text-wood-600 dark:text-wood-300">{t('config.doorStyle')}</span>
        <select
          value={config.doorStyle}
          onChange={(e) => setConfig({ doorStyle: e.target.value as DoorStyle })}
          className="mt-1 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-800 px-3 py-2 text-sm"
        >
          <option value="flat">{t('config.flat')}</option>
          <option value="shaker">{t('config.shaker')}</option>
          <option value="none">{t('config.none')}</option>
        </select>
      </label>

      {/* Door reveal */}
      <label className="block">
        <span className="text-sm text-wood-600 dark:text-wood-300">{t('config.doorReveal')}</span>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="range"
            min={CONSTRAINTS.minReveal}
            max={CONSTRAINTS.maxReveal}
            step={0.5}
            value={config.doorReveal}
            onChange={(e) => setConfig({ doorReveal: Number(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="w-12 text-right text-sm font-mono font-medium">
            {config.doorReveal} {t('config.unit')}
          </span>
        </div>
      </label>

      {/* Handle style */}
      <label className="block">
        <span className="text-sm text-wood-600 dark:text-wood-300">{t('config.handles')}</span>
        <select
          value={config.handleStyle}
          onChange={(e) => setConfig({ handleStyle: e.target.value as HandleStyle })}
          className="mt-1 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-800 px-3 py-2 text-sm"
        >
          <option value="bar">{t('config.bar')}</option>
          <option value="knob">{t('config.knob')}</option>
          <option value="cup">{t('config.cup')}</option>
          <option value="none">{t('config.noHandle')}</option>
        </select>
      </label>

      {/* Edge banding */}
      <label className="block">
        <span className="text-sm text-wood-600 dark:text-wood-300">{t('config.edgeBanding')}</span>
        <select
          value={config.edgeBanding}
          onChange={(e) => setConfig({ edgeBanding: e.target.value as EdgeBanding })}
          className="mt-1 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-800 px-3 py-2 text-sm"
        >
          <option value="all-visible">{t('config.allVisible')}</option>
          <option value="doors-only">{t('config.doorsOnly')}</option>
          <option value="none">{t('config.noBanding')}</option>
        </select>
      </label>
    </fieldset>
  );
}
