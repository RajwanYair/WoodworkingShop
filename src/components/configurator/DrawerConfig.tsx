import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { HARD_LIMITS } from '../../engine/materials';
import { SliderInput } from './SliderInput';

export function DrawerConfig() {
  const { t } = useTranslation();
  const { config, setConfig } = useCabinetStore();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.drawers')}
      </legend>

      <SliderInput
        label={t('config.drawerCount')}
        value={config.drawerCount}
        onChange={(v) => setConfig({ drawerCount: v })}
        softMin={0}
        softMax={4}
        hardMin={0}
        hardMax={HARD_LIMITS.maxDrawers}
        step={1}
      />
    </fieldset>
  );
}
