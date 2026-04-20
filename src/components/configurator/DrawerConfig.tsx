import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';

export function DrawerConfig() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.drawers')}
      </legend>

      <label className="block">
        <span className="text-sm text-wood-600 dark:text-wood-300">{t('config.drawerCount')}</span>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={config.drawerCount}
            onChange={(e) => setConfig({ drawerCount: Number(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="w-8 text-right text-sm font-mono font-medium">{config.drawerCount}</span>
        </div>
      </label>
    </fieldset>
  );
}
