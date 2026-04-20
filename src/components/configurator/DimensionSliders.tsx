import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS } from '../../engine/materials';

export function DimensionSliders() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();

  const sliders: { key: 'width' | 'height' | 'depth'; min: number; max: number }[] = [
    { key: 'width',  min: CONSTRAINTS.minWidth,  max: CONSTRAINTS.maxWidth },
    { key: 'height', min: CONSTRAINTS.minHeight, max: CONSTRAINTS.maxHeight },
    { key: 'depth',  min: CONSTRAINTS.minDepth,  max: CONSTRAINTS.maxDepth },
  ];

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.dimensions')}
      </legend>
      {sliders.map(({ key, min, max }) => (
        <label key={key} className="block">
          <span className="text-sm text-wood-600 dark:text-wood-300">
            {t(`config.${key}`)}
          </span>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="range"
              min={min}
              max={max}
              step={10}
              value={config[key]}
              onChange={(e) => setConfig({ [key]: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="w-16 text-right text-sm font-mono font-medium">
              {config[key]} {t('config.unit')}
            </span>
          </div>
        </label>
      ))}
    </fieldset>
  );
}
