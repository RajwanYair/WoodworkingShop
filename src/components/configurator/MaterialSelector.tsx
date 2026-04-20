import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { panelMaterials, backMaterials } from '../../engine/materials';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import type { Lang } from '../../engine/types';

export function MaterialSelector() {
  const { t, i18n } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const customMaterials = useCustomMaterialsStore((s) => s.materials);
  const lang = i18n.language as Lang;

  const panels = [...panelMaterials(), ...customMaterials.filter((m) => m.category === 'panel')];
  const backs = [...backMaterials(), ...customMaterials.filter((m) => m.category === 'back')];

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.material')}
      </legend>

      <label className="block">
        <span className="text-sm text-wood-600 dark:text-wood-300">{t('config.carcass')}</span>
        <select
          value={config.carcassMaterial}
          onChange={(e) => setConfig({ carcassMaterial: e.target.value })}
          className="mt-1 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-800 px-3 py-2 text-sm"
        >
          {panels.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name[lang]} ({m.thickness} mm)
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-wood-600 dark:text-wood-300">{t('config.backPanel')}</span>
        <select
          value={config.backPanelMaterial}
          onChange={(e) => setConfig({ backPanelMaterial: e.target.value })}
          className="mt-1 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-800 px-3 py-2 text-sm"
        >
          {backs.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name[lang]} ({m.thickness} mm)
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}
