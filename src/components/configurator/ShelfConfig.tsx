import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS } from '../../engine/materials';

export function ShelfConfig() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.shelves')}
      </legend>

      <label className="block">
        <span className="text-sm text-wood-600 dark:text-wood-300">{t('config.shelfCount')}</span>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="range"
            min={CONSTRAINTS.minShelves}
            max={CONSTRAINTS.maxShelves}
            step={1}
            value={config.shelfCount}
            onChange={(e) => setConfig({ shelfCount: Number(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="w-8 text-right text-sm font-mono font-medium">
            {config.shelfCount}
          </span>
        </div>
      </label>

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
