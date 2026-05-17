import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS, HARD_LIMITS } from '../../engine/materials';
import { SliderInput } from './SliderInput';

export function ShelfConfig() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.shelves')}
      </legend>

      <SliderInput
        label={t('config.shelfCount')}
        value={config.shelfCount}
        onChange={(v) => setConfig({ shelfCount: v })}
        softMin={CONSTRAINTS.minShelves}
        softMax={CONSTRAINTS.maxShelves}
        hardMin={HARD_LIMITS.minShelves}
        hardMax={HARD_LIMITS.maxShelves}
        step={1}
      />

      <div className="flex gap-4">
        {(['equal', 'custom'] as const).map((mode) => (
          <label key={mode} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="shelfSpacing"
              value={mode}
              checked={config.shelfSpacing === mode}
              onChange={() => setConfig({ shelfSpacing: mode })}
              className="accent-primary"
            />
            {t(`config.${mode}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
