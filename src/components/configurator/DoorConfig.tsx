import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS, HARD_LIMITS } from '../../engine/materials';
import type { HandleStyle, DoorStyle, EdgeBanding } from '../../engine/types';
import { SliderInput } from './SliderInput';

export function DoorConfig() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();

  return (
    <fieldset className="space-y-4">
      <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        🚪 {t('config.doors')}
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
        <span className="text-wood-600 dark:text-wood-300 text-sm">{t('config.doorStyle')}</span>
        <select
          value={config.doorStyle}
          onChange={(e) => setConfig({ doorStyle: e.target.value as DoorStyle })}
          className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 mt-1 block w-full rounded border bg-white px-3 py-2 text-sm"
        >
          <option value="flat">{t('config.flat')}</option>
          <option value="shaker">{t('config.shaker')}</option>
          <option value="glass">{t('config.glass')}</option>
          <option value="none">{t('config.none')}</option>
        </select>
      </label>

      {/* Door reveal */}
      <SliderInput
        label={t('config.doorReveal')}
        value={config.doorReveal}
        onChange={(v) => setConfig({ doorReveal: v })}
        softMin={CONSTRAINTS.minReveal}
        softMax={CONSTRAINTS.maxReveal}
        hardMin={HARD_LIMITS.minReveal}
        hardMax={HARD_LIMITS.maxReveal}
        step={0.5}
        decimals={1}
        unit={t('config.unit')}
      />

      {/* Handle style */}
      <label className="block">
        <span className="text-wood-600 dark:text-wood-300 text-sm">{t('config.handles')}</span>
        <select
          value={config.handleStyle}
          onChange={(e) => setConfig({ handleStyle: e.target.value as HandleStyle })}
          className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 mt-1 block w-full rounded border bg-white px-3 py-2 text-sm"
        >
          <option value="bar">{t('config.bar')}</option>
          <option value="knob">{t('config.knob')}</option>
          <option value="cup">{t('config.cup')}</option>
          <option value="none">{t('config.noHandle')}</option>
        </select>
      </label>

      {/* Edge banding */}
      <label className="block">
        <span className="text-wood-600 dark:text-wood-300 text-sm">{t('config.edgeBanding')}</span>
        <select
          value={config.edgeBanding}
          onChange={(e) => setConfig({ edgeBanding: e.target.value as EdgeBanding })}
          className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 mt-1 block w-full rounded border bg-white px-3 py-2 text-sm"
        >
          <option value="all-visible">{t('config.allVisible')}</option>
          <option value="doors-only">{t('config.doorsOnly')}</option>
          <option value="none">{t('config.noBanding')}</option>
        </select>
      </label>
    </fieldset>
  );
}
