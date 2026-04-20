import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { DimensionSliders } from './DimensionSliders';
import { MaterialSelector } from './MaterialSelector';
import { ShelfConfig } from './ShelfConfig';
import { DoorConfig } from './DoorConfig';

export function ConfiguratorPanel() {
  const { t } = useTranslation();
  const { resetConfig } = useCabinetStore();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <DimensionSliders />
      <MaterialSelector />
      <ShelfConfig />
      <DoorConfig />

      <button
        onClick={resetConfig}
        className="w-full rounded bg-wood-200 dark:bg-wood-700 px-4 py-2 text-sm font-medium text-wood-700 dark:text-wood-200 hover:bg-wood-300 dark:hover:bg-wood-600 transition-colors"
      >
        {t('config.reset')}
      </button>
    </div>
  );
}
