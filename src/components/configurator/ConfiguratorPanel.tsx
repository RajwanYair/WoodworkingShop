import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { BOOKSHELF_DEFAULTS } from '../../engine/materials';
import { CabinetSelector } from './CabinetSelector';
import { DimensionSliders } from './DimensionSliders';
import { MaterialSelector } from './MaterialSelector';
import { ShelfConfig } from './ShelfConfig';
import { DoorConfig } from './DoorConfig';
import { SaveLoadPanel } from './SaveLoadPanel';
import type { FurnitureType } from '../../engine/types';

export function ConfiguratorPanel() {
  const { t } = useTranslation();
  const { config, setConfig, resetConfig } = useCabinetStore();

  const handleFurnitureChange = (type: FurnitureType) => {
    if (type === 'bookshelf') {
      setConfig({ ...BOOKSHELF_DEFAULTS });
    } else {
      setConfig({ furnitureType: 'cabinet', doorStyle: 'flat', doorCount: 2, handleStyle: 'bar', depth: 600 });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <CabinetSelector />
      <SaveLoadPanel />

      {/* Furniture type selector */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
          {t('config.furnitureType')}
        </legend>
        <div className="flex gap-3">
          {(['cabinet', 'bookshelf'] as const).map((ft) => (
            <label
              key={ft}
              className={`flex-1 text-center cursor-pointer rounded border px-3 py-2 text-sm font-medium transition-colors ${
                config.furnitureType === ft
                  ? 'bg-wood-500 text-white border-wood-500'
                  : 'bg-wood-50 dark:bg-wood-800 text-wood-600 dark:text-wood-300 border-wood-200 dark:border-wood-700 hover:bg-wood-100 dark:hover:bg-wood-700'
              }`}
            >
              <input
                type="radio"
                name="furnitureType"
                value={ft}
                checked={config.furnitureType === ft}
                onChange={() => handleFurnitureChange(ft)}
                className="sr-only"
              />
              {t(`config.ft_${ft}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <DimensionSliders />
      <MaterialSelector />
      <ShelfConfig />
      {config.furnitureType !== 'bookshelf' && <DoorConfig />}

      <button
        onClick={resetConfig}
        className="w-full rounded bg-wood-200 dark:bg-wood-700 px-4 py-2 text-sm font-medium text-wood-700 dark:text-wood-200 hover:bg-wood-300 dark:hover:bg-wood-600 transition-colors"
      >
        {t('config.reset')}
      </button>
    </div>
  );
}
