import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS } from '../../engine/materials';
import { formatDim, sliderStep } from '../../utils/units';

export function DimensionSliders() {
  const { t } = useTranslation();
  const { config, setConfig, units, toggleUnits } = useCabinetStore();
  const step = sliderStep(units);

  const sliders: { key: 'width' | 'height' | 'depth'; min: number; max: number }[] = [
    { key: 'width', min: CONSTRAINTS.minWidth, max: CONSTRAINTS.maxWidth },
    { key: 'height', min: CONSTRAINTS.minHeight, max: CONSTRAINTS.maxHeight },
    { key: 'depth', min: CONSTRAINTS.minDepth, max: CONSTRAINTS.maxDepth },
  ];

  return (
    <fieldset className="space-y-4">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
          {t('config.dimensions')}
        </legend>
        <button
          onClick={toggleUnits}
          className="text-[10px] px-2 py-0.5 rounded border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
          title={t('config.toggleUnits')}
        >
          {units === 'metric' ? 'mm → in' : 'in → mm'}
        </button>
      </div>
      {sliders.map(({ key, min, max }) => (
        <label key={key} className="block">
          <span className="text-sm text-wood-600 dark:text-wood-300">{t(`config.${key}`)}</span>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={config[key]}
              aria-label={`${t(`config.${key}`)} (${units === 'metric' ? 'mm' : 'in'})`}
              aria-valuenow={config[key]}
              aria-valuemin={min}
              aria-valuemax={max}
              onChange={(e) => setConfig({ [key]: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="w-20 text-right text-sm font-mono font-medium">{formatDim(config[key], units)}</span>
          </div>
        </label>
      ))}
    </fieldset>
  );
}
